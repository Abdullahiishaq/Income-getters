const { Sequelize } = require('sequelize');
const path = require('path');
const sequelize = new Sequelize(process.env.DATABASE_URL || {
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database.sqlite')
});

const User = require('./user')(sequelize);
const Job = require('./job')(sequelize);
const Message = require('./message')(sequelize);
const Attachment = require('./attachment')(sequelize);

User.hasMany(Job, { foreignKey: 'ownerId' });
Job.belongsTo(User, { foreignKey: 'ownerId' });

User.hasMany(Message, { foreignKey: 'senderId' });
Message.belongsTo(User, { foreignKey: 'senderId' });

Job.hasMany(Attachment, { foreignKey: 'jobId' });
Attachment.belongsTo(Job, { foreignKey: 'jobId' });

module.exports = { sequelize, User, Job, Message, Attachment };