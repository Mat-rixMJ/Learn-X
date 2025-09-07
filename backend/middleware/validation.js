const Joi = require('joi');

// Validation schemas
const schemas = {
  // User registration validation
  register: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(30)
      .required()
      .messages({
        'string.alphanum': 'Username must contain only alphanumeric characters',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username must not exceed 30 characters'
      }),
    
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        'string.email': 'Please provide a valid email address'
      }),
    
    fullName: Joi.string()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'Full name must be at least 2 characters long',
        'string.max': 'Full name must not exceed 100 characters'
      }),
    
    password: Joi.string()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
      }),
    
    role: Joi.string()
      .valid('student', 'teacher')
      .required()
      .messages({
        'any.only': 'Role must be either student or teacher'
      })
  }),

  // User login validation
  login: Joi.object({
    username: Joi.string()
      .required()
      .messages({
        'any.required': 'Username is required'
      }),
    
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
      })
  }),

  // Class creation validation
  createClass: Joi.object({
    name: Joi.string()
      .min(3)
      .max(100)
      .required()
      .messages({
        'string.min': 'Class name must be at least 3 characters long',
        'string.max': 'Class name must not exceed 100 characters'
      }),
    
    description: Joi.string()
      .max(500)
      .optional()
      .messages({
        'string.max': 'Description must not exceed 500 characters'
      }),
    
    subject: Joi.string()
      .max(50)
      .optional()
      .messages({
        'string.max': 'Subject must not exceed 50 characters'
      }),
    
    maxParticipants: Joi.number()
      .integer()
      .min(1)
      .max(1000)
      .optional()
      .messages({
        'number.min': 'Maximum participants must be at least 1',
        'number.max': 'Maximum participants cannot exceed 1000'
      }),
    
    scheduledAt: Joi.date()
      .iso()
      .greater('now')
      .optional()
      .messages({
        'date.greater': 'Scheduled time must be in the future'
      }),
    
    durationMinutes: Joi.number()
      .integer()
      .min(15)
      .max(480)
      .optional()
      .messages({
        'number.min': 'Duration must be at least 15 minutes',
        'number.max': 'Duration cannot exceed 8 hours'
      })
  }),

  // Chat message validation
  chatMessage: Joi.object({
    message: Joi.string()
      .min(1)
      .max(1000)
      .required()
      .messages({
        'string.min': 'Message cannot be empty',
        'string.max': 'Message must not exceed 1000 characters'
      }),
    
    messageType: Joi.string()
      .valid('text', 'emoji', 'file')
      .default('text'),
    
    isPrivate: Joi.boolean().default(false),
    
    replyTo: Joi.string().uuid().optional()
  }),

  // Poll creation validation
  createPoll: Joi.object({
    question: Joi.string()
      .min(10)
      .max(500)
      .required()
      .messages({
        'string.min': 'Question must be at least 10 characters long',
        'string.max': 'Question must not exceed 500 characters'
      }),
    
    options: Joi.array()
      .items(Joi.string().min(1).max(100))
      .min(2)
      .max(10)
      .required()
      .messages({
        'array.min': 'Poll must have at least 2 options',
        'array.max': 'Poll cannot have more than 10 options'
      }),
    
    pollType: Joi.string()
      .valid('multiple_choice', 'single_choice', 'text', 'rating')
      .default('single_choice'),
    
    endsAt: Joi.date()
      .iso()
      .greater('now')
      .optional()
  }),

  // File upload validation
  fileUpload: Joi.object({
    uploadType: Joi.string()
      .valid('profile_picture', 'class_material', 'recording', 'slides')
      .required(),
    
    description: Joi.string()
      .max(200)
      .optional()
  })
};

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all validation errors
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

// Common validation helpers
const validateUUID = (value, helpers) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    return helpers.message('Must be a valid UUID');
  }
  return value;
};

module.exports = {
  validate,
  schemas,
  validateUUID
};
