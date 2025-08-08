const Joi = require('joi');

// Validation schema for user signup
const signupValidation = (data) => {
    const schema = Joi.object({
        name: Joi.string()
            .min(3)
            .max(50)
            .required()
            .messages({
                "string.empty": "Name is required",
                "string.min": "Name must be at least 3 characters",
                "string.max": "Name must not exceed 50 characters",
            }),
        username: Joi.string()
            .pattern(/^[a-zA-Z0-9_@#\-!$%^&*]+$/)
            .min(3)
            .max(30)
            .required()
            .messages({
                "string.empty": "Username is required",
                "string.alphanum": "Username must contain only letters and numbers",
                "string.min": "Username must be at least 3 characters",
                "string.max": "Username must not exceed 30 characters",
            }),
        password: Joi.string()
            .min(3)
            .required()
            .messages({
                "string.empty": "Password is required",
                "string.min": "Password must be at least 3 characters",
            }),
        profilePic: Joi.string()
            .uri()
            .optional()
            .messages({
                "string.uri": "Profile picture must be a valid URL",
            }),
    });

    return schema.validate(data);
};

// Validation schema for user login
const loginValidation = (data) => {
    const schema = Joi.object({
        username: Joi.string()
            .pattern(/^[a-zA-Z0-9_@#\-!$%^&*]+$/)
            .min(3)
            .max(30)
            .required()
            .messages({
                "string.empty": "Username is required",
                "string.alphanum": "Username must contain only letters and numbers",
                "string.min": "Username must be at least 3 characters",
                "string.max": "Username must not exceed 30 characters",
            }),
        password: Joi.string()
            .min(3).required()
            .messages({
                "string.empty": "Password is required",
                "string.min": "Password must be at least 3 characters",
            }),
    });

    return schema.validate(data);
};

module.exports = {
    signupValidation,
    loginValidation,
};