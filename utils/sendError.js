export const sendError = (res, message, status = 500) => {
	res.status(status).json({ success: false, message });
};
