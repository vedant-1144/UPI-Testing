const Joi = require('joi');

// UPI ID validation
const validateUPIId = (upiId) => {
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
  return upiRegex.test(upiId);
};

// Amount validation
const validateAmount = (amount) => {
  const amountSchema = Joi.number().min(0.01).max(100000).required();
  const { error } = amountSchema.validate(amount);
  return !error;
};

// PIN validation
const validatePIN = (pin) => {
  const pinSchema = Joi.string().pattern(/^\d{4,6}$/).required();
  const { error } = pinSchema.validate(pin);
  return !error;
};

// Phone validation
const validatePhone = (phone) => {
  const phoneSchema = Joi.string().pattern(/^[6-9]\d{9}$/).required();
  const { error } = phoneSchema.validate(phone);
  return !error;
};

// Email validation
const validateEmail = (email) => {
  const emailSchema = Joi.string().email().required();
  const { error } = emailSchema.validate(email);
  return !error;
};

// Sanitize input to prevent SQL injection
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove potentially dangerous characters
  return input
    .replace(/[<>\"'%;()&+]/g, '')
    .trim();
};

// Validate transaction request
const validateTransactionRequest = (req) => {
  const schema = Joi.object({
    toUpiId: Joi.string().custom((value, helpers) => {
      if (!validateUPIId(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    }).required(),
    amount: Joi.number().min(0.01).max(100000).required(),
    description: Joi.string().max(100).optional(),
    pin: Joi.string().pattern(/^\d{4,6}$/).required()
  });

  return schema.validate(req);
};

// Validate registration request
const validateRegistrationRequest = (req) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
    email: Joi.string().email().required(),
    pin: Joi.string().pattern(/^\d{4,6}$/).required(),
    deviceId: Joi.string().min(1).required()
  });

  return schema.validate(req);
};

module.exports = {
  validateUPIId,
  validateAmount,
  validatePIN,
  validatePhone,
  validateEmail,
  sanitizeInput,
  validateTransactionRequest,
  validateRegistrationRequest
};
