const express = require("express")
const { Op } = require("sequelize")
const { Event, User, Booking } = require("../models")
const { authenticateToken, requireAdmin, optionalAuth } = require("../middleware/auth")
const {
  validateRequest,
  validateQuery,
  eventSchema,
  eventUpdateSchema,
  querySchema,
} = require("../middleware/validation")

const router = express.Router()

/**
 * @swagger
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - datetime
 *         - location
 *         - totalSeats
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         datetime:
 *           type: string
 *           format: date-time
 *         location:
 *           type: string
 *         totalSeats:
 *           type: integer
 *         availableSeats:
 *           type: integer
 *         price:
 *           type: number
 *         category:
 *           type: string
 */

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Get all events with pagination and filtering
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of events per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and description
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: Events retrieved successfully
 */
router.get("/", optionalAuth, validateQuery(querySchema), async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, category, sortBy = "datetime", sortOrder = "asc" } = req.query

    const offset = (page - 1) * limit

    // Build where clause
    const whereClause = {
      isActive: true,
      datetime: {
        [Op.gte]: new Date(),
      },
    }

    if (search) {
      whereClause[Op.or] = [{ title: { [Op.iLike]: `%${search}%` } }, { description: { [Op.iLike]: `%${search}%` } }]
    }

    if (category) {
      whereClause.category = category
    }

    const { count, rows: events } = await Event.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName"],
        },
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: Number.parseInt(limit),
      offset: Number.parseInt(offset),
    })

    const totalPages = Math.ceil(count / limit)

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          currentPage: Number.parseInt(page),
          totalPages,
          totalEvents: count,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get event by ID
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Event retrieved successfully
 *       404:
 *         description: Event not found
 */
router.get("/:id", optionalAuth, async (req, res, next) => {
  try {
    const event = await Event.findOne({
      where: {
        id: req.params.id,
        isActive: true,
      },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName"],
        },
      ],
    })

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      })
    }

    res.json({
      success: true,
      data: { event },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new event (Admin only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Event'
 *     responses:
 *       201:
 *         description: Event created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post("/", authenticateToken, requireAdmin, validateRequest(eventSchema), async (req, res, next) => {
  try {
    const { title, description, datetime, location, totalSeats, price = 0, category } = req.body

    const event = await Event.create({
      title,
      description,
      datetime,
      location,
      totalSeats,
      availableSeats: totalSeats,
      price,
      category,
      createdBy: req.user.id,
    })

    const eventWithCreator = await Event.findByPk(event.id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName"],
        },
      ],
    })

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: { event: eventWithCreator },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     summary: Update event (Admin only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Event'
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       404:
 *         description: Event not found
 */
router.put("/:id", authenticateToken, requireAdmin, validateRequest(eventUpdateSchema), async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id)

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      })
    }

    // If totalSeats is being updated, adjust availableSeats accordingly
    if (req.body.totalSeats) {
      const bookedSeats = event.totalSeats - event.availableSeats
      req.body.availableSeats = req.body.totalSeats - bookedSeats

      if (req.body.availableSeats < 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot reduce total seats below already booked seats",
        })
      }
    }

    await event.update(req.body)

    const updatedEvent = await Event.findByPk(event.id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName"],
        },
      ],
    })

    res.json({
      success: true,
      message: "Event updated successfully",
      data: { event: updatedEvent },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Delete event (Admin only)
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       404:
 *         description: Event not found
 */
router.delete("/:id", authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id)

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      })
    }

    // Soft delete by setting isActive to false
    await event.update({ isActive: false })

    res.json({
      success: true,
      message: "Event deleted successfully",
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
