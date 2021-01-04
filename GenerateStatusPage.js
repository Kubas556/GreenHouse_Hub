module.exports = function GenerateStatusPage(lastUserName,devices) {
	
	function list() {
		let generatedList = '<ul>';
		devices.forEach(device=>{
			generatedList += 
			'<li>'+
				device.mac+
				'<form action="/discDev" method="post">'+
				'<input type="text" id="mac" name="mac" value="'+device.mac+'">'+
				'<input type="submit" value="Disconnect From WiFi">'+
				'</form>'+
			'</li>';
		});
		generatedList += '</ul>';
		return generatedList;
	}
	
	return '<p>server is running</p>'+
			'<p>Logged in as: '+lastUserName+'</p>'+
			'<form action="/logout" method="post">'+
				'<input type="submit" value="Logout">'+
			'</form>'+list();
}
