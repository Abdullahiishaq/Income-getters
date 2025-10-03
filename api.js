const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const upload = multer({ dest: 'uploads/' });
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, Job, Message, Attachment } = require('../models');
const stripe = require('stripe')(process.env.STRIPE_SECRET || 'sk_test_replace');
const AWS = require('aws-sdk');

const authMiddleware = async (req, res, next)=>{
  const header = req.headers.authorization;
  if(!header) return res.status(401).json({error:'no token'});
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    req.user = await User.findByPk(payload.sub);
    if(!req.user) return res.status(401).json({error:'invalid token'});
    next();
  } catch(e){ return res.status(401).json({error:'invalid token'}); }
};

// auth
router.post('/auth/register', async (req,res)=>{
  const { name, email, password, role } = req.body;
  if(!email || !password) return res.status(400).json({error:'missing fields'});
  const hash = await bcrypt.hash(password, 10);
  try {
    const user = await User.create({ name: name||email.split('@')[0], email, passwordHash: hash, role: role||'freelancer' });
    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
    res.json({ token, user: { id:user.id, email: user.email, name: user.name, role: user.role } });
  } catch(e){ res.status(400).json({error: e.message}); }
});

router.post('/auth/login', async (req,res)=>{
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  if(!user) return res.status(401).json({error:'invalid'});
  const ok = await bcrypt.compare(password, user.passwordHash);
  if(!ok) return res.status(401).json({error:'invalid'});
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
  res.json({ token, user: { id:user.id, email: user.email, name: user.name, role: user.role } });
});

// get current user / profile
router.get('/me', authMiddleware, async (req,res)=>{
  const u = await User.findByPk(req.user.id);
  res.json({ user: u });
});

const profileUpload = multer({ dest: 'uploads/' });
router.put('/me', profileUpload.fields([{ name:'avatar', maxCount:1 }, { name:'cv', maxCount:1 }]), authMiddleware, async (req,res)=>{
  try {
    const u = await User.findByPk(req.user.id);
    const { title, skills, bio, avatarUrl, cvPath } = req.body;
    if(title) u.title = title;
    if(skills) u.skills = skills;
    if(bio) u.bio = bio;
    if(avatarUrl) u.avatarUrl = avatarUrl;
    if(cvPath) u.cvPath = cvPath;
    if(req.files && req.files.avatar && req.files.avatar[0]){
      const a = req.files.avatar[0];
      if(a.size > 2*1024*1024) return res.status(400).json({ error: 'Avatar too large' });
      if(!['image/png','image/jpeg'].includes(a.mimetype)) return res.status(400).json({ error: 'Invalid avatar type' });
      u.avatarUrl = '/uploads/' + a.filename;
    }
    if(req.files && req.files.cv && req.files.cv[0]){
      const c = req.files.cv[0];
      if(c.size > 5*1024*1024) return res.status(400).json({ error: 'CV too large' });
      if(c.mimetype !== 'application/pdf') return res.status(400).json({ error: 'CV must be PDF' });
      u.cvPath = '/uploads/' + c.filename;
    }
    await u.save();
    res.json({ user: u });
  } catch(e){ res.status(500).json({ error: e.message }); }
});

// jobs (public read)
router.get('/jobs', async (req,res)=>{
  const jobs = await Job.findAll({ order: [['createdAt','DESC']] });
  res.json({ jobs });
});

router.get('/jobs/:id', async (req,res)=>{
  const job = await Job.findByPk(req.params.id);
  if(!job) return res.status(404).json({error:'not found'});
  res.json({ job });
});

// POST job requires auth; validate attachment size <=8MB
router.post('/jobs', upload.single('attachment'), authMiddleware, async (req,res)=>{
  try {
    const { title, category, type, location, budget, description, skills } = req.body;
    const ownerId = req.user.id;
    if(req.file){
      if(req.file.size > 8*1024*1024) return res.status(400).json({ error: 'Attachment too large' });
    }
    const job = await Job.create({ title, category, type, location, budget, description, skills, ownerId });
    if(req.file){
      await Attachment.create({ filename: req.file.originalname, path: req.file.path, jobId: job.id });
    }
    res.json({ job });
  } catch(e){ res.status(500).json({error:e.message}); }
});

// messaging endpoints (demo)
router.get('/messages/:room', async (req,res)=>{
  const messages = await Message.findAll({ where: { room: req.params.room }, order:[['createdAt','ASC']] });
  res.json({ messages });
});

router.post('/messages', async (req,res)=>{
  const { room, text, senderId } = req.body;
  const msg = await Message.create({ room, text, senderId });
  res.json({ msg });
});

// stripe demo checkout
router.post('/payments/create-checkout', express.json(), async (req,res)=>{
  const { amount=1000, currency='usd', jobId } = req.body;
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency, product_data: { name: `Payment for job ${jobId||'demo'}` }, unit_amount: amount }, quantity: 1 }],
      mode: 'payment',
      success_url: process.env.SUCCESS_URL || 'http://localhost:4000/',
      cancel_url: process.env.CANCEL_URL || 'http://localhost:4000/'
    });
    res.json({ url: session.url });
  } catch(e){ res.status(500).json({ error: e.message }); }
});

// stripe webhook endpoint
router.post('/payments/webhook', async (req,res)=>{
  const sig = req.headers['stripe-signature'];
  const payload = req.body;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event = null;
  try {
    if(webhookSecret){
      event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    } else {
      event = JSON.parse(payload.toString());
    }
  } catch(err){
    console.error('Webhook verify failed', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  console.log('Received stripe event', event.type);
  res.json({ received: true });
});

module.exports = router;