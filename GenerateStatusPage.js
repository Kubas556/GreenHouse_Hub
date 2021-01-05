/**
 * @return {string}
 */
module.exports = function GenerateStatusPage(lastUserName,devices) {
	
	function list() {
		let generatedList = '<ul>';
		devices.forEach(device=>{
			generatedList += 
			'<li style="background: cornflowerblue;\n' +
				'    width: 19rem;">'+
				device.mac+
				'<form style="display: inline-block;\n' +
				'    margin: 0;\n" action="/discDev" method="post">'+
				'<input type="text" style="display: none" id="mac" name="mac" value="'+device.mac+'">'+
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
			'</form>'+
		'<h3>Connected devices</h3>'+
		list();
}
