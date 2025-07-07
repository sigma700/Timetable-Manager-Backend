//function for converting the object ids to the actual data

export default function getNameFromId(id, array) {
	const item = array.find((item) => item._id === id);
	return item ? item.name : 'Unknown';
}
