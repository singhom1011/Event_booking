const { Sequelize } = require("sequelize")
const config = require("../config/database")

const env = process.env.NODE_ENV || "development"
const dbConfig = config[env]

const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: dbConfig.dialect,
  logging: dbConfig.logging,
  dialectOptions: dbConfig.dialectOptions || {},
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
})

// Import models
const User = require("./User")(sequelize, Sequelize.DataTypes)
const Event = require("./Event")(sequelize, Sequelize.DataTypes)
const Booking = require("./Booking")(sequelize, Sequelize.DataTypes)

// Define associations
User.hasMany(Event, { foreignKey: "createdBy", as: "createdEvents" })
Event.belongsTo(User, { foreignKey: "createdBy", as: "creator" })

User.hasMany(Booking, { foreignKey: "userId", as: "bookings" })
Booking.belongsTo(User, { foreignKey: "userId", as: "user" })

Event.hasMany(Booking, { foreignKey: "eventId", as: "bookings" })
Booking.belongsTo(Event, { foreignKey: "eventId", as: "event" })

module.exports = {
  sequelize,
  User,
  Event,
  Booking,
}
