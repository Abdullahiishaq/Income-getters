const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  return sequelize.define('Attachment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    filename: { type: DataTypes.STRING },
    path: { type: DataTypes.STRING },
    jobId: { type: DataTypes.INTEGER }
  }, { timestamps: true });
};