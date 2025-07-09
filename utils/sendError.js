export const sendError = (res, message, status = 500) => {
	res.status(status).json({ success: false, message });
};

export const sendSucess = (res, message, data, status = 200) => {
	res.status(status).json({ success: true, message, data });
};
