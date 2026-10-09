'use strict';

const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name too short').max(80),
  email: z.string().trim().toLowerCase().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 chars').max(128),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{7,15}$/, 'Invalid phone number')
    .optional(),
  upiId: z
    .string()
    .trim()
    .regex(/^[\w.\-]{2,}@[a-zA-Z]{2,}$/, 'Invalid UPI ID (e.g. name@bank)')
    .optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

const updateMeSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{7,15}$/, 'Invalid phone number')
    .optional(),
  upiId: z
    .string()
    .trim()
    .regex(/^[\w.\-]{2,}@[a-zA-Z]{2,}$/, 'Invalid UPI ID')
    .optional()
    .nullable(),
});

module.exports = { registerSchema, loginSchema, updateMeSchema };