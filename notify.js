var config = require('config');

var twilio_config = config.get('twilio');
var twilio = require('twilio')(twilio_config.sid, twilio_config.secret);

var connection = require('./common/db');	
var time = require('./common/time');

var CronJob = require('cron').CronJob;

function updateAppointment(id){

	//update appointment to notified=1
	connection.db.query(
		"UPDATE appointments SET notified = 1 WHERE id = ?", 
		[id], 
		function(error, results, fields){
			if(!error){
				console.log('updated appointment with ID of ' + id);
			}
		}
	);
}


function sendNotifications(error, results, fields){

	var phone_number = config.get('me.phone_number');
	console.log(phone_number);
	
	console.log('results');
	console.log(results);

	if(!error){	
		for(var x in results){

			var id = results[x].id;
			var datetime_start = results[x].datetime_start;
			var datetime_end = results[x].datetime_end;
			
			var appointment_start = time.moment(datetime_start);
			var summary = results[x].summary + " is fast approaching on " + appointment_start.format('MMM DD, YYYY hh:mm a'); 

			var hour_diff = appointment_start.diff(time.moment(), 'hours');

			console.log('hour diff:');
			console.log(hour_diff);
			
			if(hour_diff <= 24){

				twilio.sendMessage({
				    to: phone_number, 
				    from: twilio_config.phone_number,
				    body: summary
				}, function(err, responseData){ 

				    if(!err){ 
				    	console.log('message sent!');
				        console.log(responseData.from); 
				        console.log(responseData.body); 
				    }else{
				    	console.log('error:');
				    	console.log(err);
				    }
				});

				updateAppointment(id);
			}
			

		}
	}

}


function startTask(){

	connection.db.query('SELECT * FROM appointments WHERE notified = 0', sendNotifications);

}

new CronJob('0 12 * * *', startTask, null, true, time.config.timezone);
