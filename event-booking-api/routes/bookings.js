const express = require("express")
const { sequelize, Booking, Event, User } = require("../models")
const { authenticateToken } = require("../middleware/auth")
const { validateRequest, bookingSchema } = require("../middleware/validation")

const router = express.Router()

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       required:
 *         - eventId
 *         - numberOfSeats
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         eventId:
 *           type: string
 *           format: uuid
 *         numberOfSeats:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *         totalAmount:
 *           type: number
 *         status:
 *           type: string
 *           enum: [confirmed, cancelled, pending]
 */

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Get user's bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
 */
router.get("/", authenticateToken, async (req, res, next) => {
  try {
    const bookings = await Booking.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Event,
          as: "event",
          attributes: ["id", "title", "datetime", "location", "price"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })

    res.json({
      success: true,
      data: { bookings },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     tags: [Bookings]
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
 *         description: Booking retrieved successfully
 *       404:
 *         description: Booking not found
 */
router.get("/:id", authenticateToken, async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      include: [
        {
          model: Event,
          as: "event",
          attributes: ["id", "title", "datetime", "location", "price"],
        },
      ],
    })

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      })
    }

    res.json({
      success: true,
      data: { booking },
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Booking'
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Validation error or insufficient seats
 *       404:
 *         description: Event not found
 *       409:
 *         description: User already has a booking for this event
 */
router.post("/", authenticateToken, validateRequest(bookingSchema), async (req, res, next) => {
  const transaction = await sequelize.transaction()

  try {
    const { eventId, numberOfSeats, notes } = req.body

    // Check if event exists and is active
    const event = await Event.findOne({
      where: {
        id: eventId,
        isActive: true,
        datetime: {
          [require("sequelize").Op.gte]: new Date(),
        },
      },
      transaction,
    })

    if (!event) {
      await transaction.rollback()
      return res.status(404).json({
        success: false,
        message: "Event not found or not available for booking",
      })
    }

    // Check if user already has a booking for this event
    const existingBooking = await Booking.findOne({
      where: {
        userId: req.user.id,
        eventId: eventId,
        status: { [require("sequelize").Op.ne]: "cancelled" },
      },
      transaction,
    })

    if (existingBooking) {
      await transaction.rollback()
      return res.status(409).json({
        success: false,
        message: "You already have a booking for this event",
      })
    }

    // Check if enough seats are available
    if (event.availableSeats < numberOfSeats) {
      await transaction.rollback()
      return res.status(400).json({
        success: false,
        message: `Only ${event.availableSeats} seats available`,
      })
    }

    // Calculate total amount
    const totalAmount = event.price * numberOfSeats

    // Create booking
    const booking = await Booking.create(
      {
        userId: req.user.id,
        eventId,
        numberOfSeats,
        totalAmount,
        notes,
        status: "confirmed",
      },
      { transaction },
    )

    // Update available seats
    await event.update(
      {
        availableSeats: event.availableSeats - numberOfSeats,
      },
      { transaction },
    )

    await transaction.commit()

    // Fetch booking with event details
    const bookingWithEvent = await Booking.findByPk(booking.id, {
      include: [
        {
          model: Event,
          as: "event",
          attributes: ["id", "title", "datetime", "location", "price"],
        },
      ],
    })

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: { booking: bookingWithEvent },
    })
  } catch (error) {
    await transaction.rollback()
    next(error)
  }
})

/**
 * @swagger
 * /api/bookings/{id}/cancel:
 *   patch:
 *     summary: Cancel a booking
 *     tags: [Bookings]
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
 *         description: Booking cancelled successfully
 *       404:
 *         description: Booking not found
 *       400:
 *         description: Booking cannot be cancelled
 */
router.patch("/:id/cancel", authenticateToken, async (req, res, next) => {
  const transaction = await sequelize.transaction()

  try {
    const booking = await Booking.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      include: [
        {
          model: Event,
          as: "event",
        },
      ],
      transaction,
    })

    if (!booking) {
      await transaction.rollback()
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      })
    }

    if (booking.status === "cancelled") {
      await transaction.rollback()
      return res.status(400).json({
        success: false,
        message: "Booking is already cancelled",
      })
    }

    // Check if event is in the past
    if (new Date(booking.event.datetime) < new Date()) {
      await transaction.rollback()
      return res.status(400).json({
        success: false,
        message: "Cannot cancel booking for past events",
      })
    }

    // Update booking status
    await booking.update({ status: "cancelled" }, { transaction })

    // Return seats to available pool
    await booking.event.update(
      {
        availableSeats: booking.event.availableSeats + booking.numberOfSeats,
      },
      { transaction },
    )

    await transaction.commit()

    res.json({
      success: true,
      message: "Booking cancelled successfully",
      data: { booking },
    })
  } catch (error) {
    await transaction.rollback()
    next(error)
  }
})

module.exports = router
