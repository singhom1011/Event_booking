# Event Booking System API

A comprehensive RESTful API for an event booking system built with Node.js, Express, Sequelize (PostgreSQL), and JWT-based authentication.

## Features

### 🔐 Authentication & Authorization
- User registration and login with email/password
- Secure password hashing using bcrypt
- JWT-based authentication
- Role-based access control (admin/user)
- Token refresh functionality

### 🎫 Event Management
- Create, read, update, and delete events (admin only)
- Public event listing with pagination and filtering
- Event search functionality
- Category-based filtering
- Seat availability tracking

### 📅 Booking System
- Book event tickets for authenticated users
- View and manage user bookings
- Cancel bookings with automatic seat restoration
- Prevent overbooking with transaction safety
- One booking per user per event restriction

### 🛡️ Security Features
- Input validation using Joi
- Rate limiting
- CORS protection
- Helmet security headers
- SQL injection prevention
- XSS protection

### 📚 Documentation
- Comprehensive Swagger/OpenAPI documentation
- Detailed API endpoint descriptions
- Request/response examples

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Documentation**: Swagger/OpenAPI
- **Security**: Helmet, CORS, Rate Limiting
- **Containerization**: Docker & Docker Compose

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+
- Docker (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd event-booking-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=3000
   
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=event_booking_dev
   DB_USERNAME=postgres
   DB_PASSWORD=your_password
   
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=24h
   ```

4. **Database setup**
   ```bash
   # Create database
   createdb event_booking_dev
   
   # Run migrations (if using Sequelize CLI)
   npm run migrate
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

### Docker Setup

1. **Using Docker Compose (Recommended)**
   ```bash
   docker-compose up -d
   ```

2. **Manual Docker build**
   ```bash
   docker build -t event-booking-api .
   docker run -p 3000:3000 event-booking-api
   ```

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/refresh` - Refresh JWT token

### Events
- `GET /api/events` - List events (public, with pagination)
- `GET /api/events/:id` - Get event details (public)
- `POST /api/events` - Create event (admin only)
- `PUT /api/events/:id` - Update event (admin only)
- `DELETE /api/events/:id` - Delete event (admin only)

### Bookings
- `GET /api/bookings` - Get user bookings
- `GET /api/bookings/:id` - Get booking details
- `POST /api/bookings` - Create booking
- `PATCH /api/bookings/:id/cancel` - Cancel booking

### Users (Admin only)
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user details
- `PATCH /api/users/:id/toggle-status` - Toggle user status

## Usage Examples

### Register a new user
```bash
curl -X POST http://localhost:3000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Create an event (admin)
```bash
curl -X POST http://localhost:3000/api/events \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{
    "title": "Tech Conference 2024",
    "description": "Annual technology conference",
    "datetime": "2024-06-15T09:00:00Z",
    "location": "Convention Center",
    "totalSeats": 500,
    "price": 99.99,
    "category": "technology"
  }'
```

### Book an event
```bash
curl -X POST http://localhost:3000/api/bookings \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{
    "eventId": "event-uuid-here",
    "numberOfSeats": 2,
    "notes": "VIP seating preferred"
  }'
```

## Database Schema

### Users Table
- `id` (UUID, Primary Key)
- `firstName` (String, Required)
- `lastName` (String, Required)
- `email` (String, Unique, Required)
- `password` (String, Hashed, Required)
- `role` (Enum: 'user', 'admin')
- `isActive` (Boolean)
- `lastLogin` (DateTime)
- `createdAt`, `updatedAt` (Timestamps)

### Events Table
- `id` (UUID, Primary Key)
- `title` (String, Required)
- `description` (Text, Required)
- `datetime` (DateTime, Required)
- `location` (String, Required)
- `totalSeats` (Integer, Required)
- `availableSeats` (Integer, Required)
- `price` (Decimal, Default: 0.00)
- `category` (String, Optional)
- `isActive` (Boolean, Default: true)
- `createdBy` (UUID, Foreign Key to Users)
- `createdAt`, `updatedAt` (Timestamps)

### Bookings Table
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key to Users)
- `eventId` (UUID, Foreign Key to Events)
- `numberOfSeats` (Integer, Required)
- `totalAmount` (Decimal, Required)
- `status` (Enum: 'confirmed', 'cancelled', 'pending')
- `bookingDate` (DateTime)
- `notes` (Text, Optional)
- `createdAt`, `updatedAt` (Timestamps)

## Architecture

The application follows the MVC (Model-View-Controller) pattern:

- **Models**: Database entities and relationships (Sequelize ORM)
- **Controllers**: Business logic in route handlers
- **Middleware**: Authentication, validation, error handling
- **Routes**: API endpoint definitions

### Project Structure
```
├── config/
│   └── database.js          # Database configuration
├── middleware/
│   ├── auth.js             # Authentication middleware
│   ├── validation.js       # Input validation schemas
│   └── errorHandler.js     # Global error handling
├── models/
│   ├── index.js            # Model associations
│   ├── User.js             # User model
│   ├── Event.js            # Event model
│   └── Booking.js          # Booking model
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── events.js           # Event management routes
│   ├── bookings.js         # Booking management routes
│   └── users.js            # User management routes
├── .env.example            # Environment variables template
├── docker-compose.yml      # Docker composition
├── Dockerfile              # Docker container definition
├── package.json            # Dependencies and scripts
├── server.js               # Application entry point
└── README.md               # This file
```

## Security Considerations

- **Password Security**: Passwords are hashed using bcrypt with salt rounds
- **JWT Security**: Tokens include expiration and are signed with a secret key
- **Input Validation**: All inputs are validated using Joi schemas
- **SQL Injection**: Prevented by using Sequelize ORM parameterized queries
- **Rate Limiting**: API endpoints are rate-limited to prevent abuse
- **CORS**: Cross-origin requests are properly configured
- **Headers**: Security headers are set using Helmet

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Deployment

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000
DB_HOST=your-production-db-host
DB_NAME=your-production-db-name
DB_USERNAME=your-production-db-user
DB_PASSWORD=your-production-db-password
JWT_SECRET=your-very-long-and-random-production-secret
JWT_EXPIRES_IN=24h
```

### Production Deployment Steps

1. **Set up PostgreSQL database**
2. **Configure environment variables**
3. **Build and deploy the application**
4. **Run database migrations**
5. **Set up SSL/TLS certificates**
6. **Configure reverse proxy (nginx)**

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the API documentation at `/api-docs`
- Review the health check endpoint at `/health`

## Changelog

### v1.0.0
- Initial release with full event booking functionality
- JWT authentication and authorization
- Complete CRUD operations for events and bookings
- Swagger documentation
- Docker support
- Comprehensive security features
```

