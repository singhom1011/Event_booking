const Joi = require("joi")

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body)

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(", ")
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errorMessage,
      })
    }

    next()
  }
}

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query)

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(", ")
      return res.status(400).json({
        success: false,
        message: "Query validation error",
        errors: errorMessage,
      })
    }

    next()
  }
}

// Validation schemas
const userRegistrationSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid("user", "admin").optional(),
})

const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
})

const eventSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().min(10).max(2000).required(),
  datetime: Joi.date().greater("now").required(),
  location: Joi.string().min(5).max(200).required(),
  totalSeats: Joi.number().integer().min(1).max(100000).required(),
  price: Joi.number().min(0).optional(),
  category: Joi.string().max(50).optional(),
})

const eventUpdateSchema = Joi.object({
  title: Joi.string().min(3).max(200).optional(),
  description: Joi.string().min(10).max(2000).optional(),
  datetime: Joi.date().greater("now").optional(),
  location: Joi.string().min(5).max(200).optional(),
  totalSeats: Joi.number().integer().min(1).max(100000).optional(),
  price: Joi.number().min(0).optional(),
  category: Joi.string().max(50).optional(),
})

const bookingSchema = Joi.object({
  eventId: Joi.string().uuid().required(),
  numberOfSeats: Joi.number().integer().min(1).max(10).required(),
  notes: Joi.string().max(500).optional(),
})

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().max(100).optional(),
  category: Joi.string().max(50).optional(),
  sortBy: Joi.string().valid("datetime", "title", "price", "createdAt").optional(),
  sortOrder: Joi.string().valid("asc", "desc").optional(),
})

module.exports = {
  validateRequest,
  validateQuery,
  userRegistrationSchema,
  userLoginSchema,
  eventSchema,
  eventUpdateSchema,
  bookingSchema,
  querySchema,
}
