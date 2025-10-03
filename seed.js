const { sequelize, User, Job } = require('../models');
const bcrypt = require('bcrypt');

async function seed(){
  await sequelize.sync({ force: true });
  const hash = await bcrypt.hash('password123', 10);
  const alice = await User.create({ name: 'Alice Employer', email: 'alice@demo.com', passwordHash: hash, role: 'employer' });
  const bob = await User.create({ name: 'Bob Freelancer', email: 'bob@demo.com', passwordHash: hash, role: 'freelancer', title: 'Full-stack Developer', skills: 'React,Node,Postgres', bio: 'Experienced developer' });
  await Job.create({ title: 'Build a React app', category: 'Development', type: 'Fixed', location: 'Remote', budget: '$2000', description: 'Looking for experienced React dev', skills: 'React,JavaScript', ownerId: alice.id });
  await Job.create({ title: 'Logo design', category: 'Design', type: 'Fixed', location: 'Remote', budget: '$300', description: 'Branding + logo', skills: 'Illustrator,Branding', ownerId: alice.id });
  console.log('Seeded demo data. Users: alice@demo.com / bob@demo.com (password123)');
  process.exit(0);
}
seed();