import rateLimit from 'express-rate-limit';

export class RateLimiter {
  static authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  static loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // limit each IP to 10 login requests per windowMs
    message: { message: 'Too many login attempts, please try again after 5 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
  });
}
