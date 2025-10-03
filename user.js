const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  return sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false, defaultValue: 'freelancer' },
    avatarUrl: { type: DataTypes.STRING },
    cvPath: { type: DataTypes.STRING },
    title: { type: DataTypes.STRING },
    skills: { type: DataTypes.STRING },
    bio: { type: DataTypes.TEXT }
  }, { timestamps: true });
};