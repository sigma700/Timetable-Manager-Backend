//for automatically calculating times in the timetable according to the user specifications
export default function calculateTime(baseTime, minutesToAdd) {
	return moment(baseTime, 'HH:mm').add(minutesToAdd, 'minutes').format('HH:mm');
}
