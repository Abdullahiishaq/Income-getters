const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  return sequelize.define('Job', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING },
    type: { type: DataTypes.STRING },
    location: { type: DataTypes.STRING },
    budget: { type: DataTypes.STRING },
    skills: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    ownerId: { type: DataTypes.INTEGER }
  }, { timestamps: true });
};