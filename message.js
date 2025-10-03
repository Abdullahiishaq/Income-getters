const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  return sequelize.define('Message', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    room: { type: DataTypes.STRING },
    text: { type: DataTypes.TEXT },
    senderId: { type: DataTypes.INTEGER }
  }, { timestamps: true });
};