import express, { Response } from 'express';
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import hpp from "hpp";
import cors from "cors";
import timeout from 'connect-timeout';
import { logError, logInfo } from './utils/log';
import { env } from './config';
import { closeRedis, connectRedis } from './utils/redis';
import { AssetsRoute } from './routes/assets.route';
import { GeckoTerminalService } from './services/gecko-terminal/gecko-terminal.service';

const app = express();

// Set trust proxy if behind a reverse proxy (like Nginx or AWS ELB)
app.set('trust proxy', 1);

// Enhanced Request logging middleware with execution time tracking
app.use((req, res, next) => {
    const start = process.hrtime();
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    // const userAgent = req.headers['user-agent'] || 'unknown';
    const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

    // Log request start
    logInfo(`[REQUEST START] ${new Date().toISOString()} - ID: ${requestId} - IP: ${ip} - ${req.method} ${req.url}`);

    // Add request ID to response headers for tracking
    res.setHeader('X-Request-ID', requestId);

    // Override end function to calculate and log execution time
    const originalEnd = res.end;

    // Use proper TypeScript casting to fix the type error
    res.end = function (this: Response, chunk?: any, encoding?: BufferEncoding | (() => void), callback?: () => void): Response {
        const diff = process.hrtime(start);
        const time = diff[0] * 1000 + diff[1] / 1000000; // Convert to milliseconds

        // Log request completion with execution time and status code
        logInfo(`[REQUEST END] ${req.method} ${req.baseUrl + req.url.split("?")[0].slice(0, 50)} - IP: ${ip} - Status: ${res.statusCode} - Time: ${time.toFixed(2)}ms`);

        // Handle the various function signature overloads
        if (typeof encoding === 'function') {
            callback = encoding;
            encoding = undefined;
        }

        return originalEnd.call(this, chunk, encoding as BufferEncoding, callback);
    };

    next();
});

// Set request timeout to prevent hanging connections
app.use(timeout(`${env.REQUEST_TIMEOUT_MS}ms`));
app.use((req, res, next) => {
    if (!req.timedout) next();
});

// Rate limiting to prevent DDoS attacks
const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests'
});
app.use(limiter);

// Body parser with size limit
app.use(express.json({ limit: env.BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: env.BODY_LIMIT }));

// Enhanced CORS configuration
app.use(cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
}));

// Enhanced security with Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'same-site' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'no-referrer' },
    xssFilter: true
}));

// Prevent XSS attacks
app.disable('x-powered-by');

// Sanitization against NoSQL query injection
// app.use(mongoSanitize());

// Prevent parameter pollution
app.use(hpp());

(async () => {
    try {
        logInfo("Starting Hollow Protocol API...");

        await connectRedis();

        // SERVICES
        const geckoTerminalService = new GeckoTerminalService();

        // ROUTES
        const assetsRoute = new AssetsRoute(geckoTerminalService);

        app.use('/assets', assetsRoute.router);

        const PORT = env.PORT;
        app.listen(PORT, () => {
            logInfo(`HTTP Server running on port ${PORT}`);
        });

        process.on('SIGINT', async () => {
            await closeRedis();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            await closeRedis();
            process.exit(0);
        });

    } catch (error) {
        logError(`Failed to start server: ${error}`);
        process.exit(1);
    }
})();