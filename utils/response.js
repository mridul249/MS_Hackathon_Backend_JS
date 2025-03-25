export const successResponse = (res, messageCode, data = {}, statusCode = 200) => {
    if (typeof statusCode !== "number") {
        throw new Error("Invalid status code");
    }
    return res.status(statusCode).json({
        status: "success",
        messageCode,
        data,
    });
};

export const errorResponse = (res, messageCode, message, statusCode = 400) => {
    return res.status(statusCode).json({
        status: "error",
        messageCode,
        message,
    });
};
  