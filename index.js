function timeMs() {
    time = process.hrtime()
    return time[0] * 1000 + time[1] / 1000000

}

function main(args) {
    const infinispan = require('infinispan')
    const request = require('request')

    const config = require("./config.json")

    actionStart = timeMs()
    console.log("args:", args)

    lookup = function lookup(param) {
	if (param in args) {
	    console.log("found", param, "in args")
	    return args[param]
	} else if (param in config) {
	    console.log("found", param, "in config")
	    return config[param]
	} else throw new Error("cannot find: " + param)
    }

    infinispanHost = lookup('infinispanHost')
    infinispanPort = lookup('infinispanPort')
    swiftObj = lookup('swiftObj')
    s3Start = timeMs()
    url = swiftObj.url + "/" + swiftObj.container + "/" + swiftObj.object
    request.get({
	url: url,
	encoding: null
    }, (err, res, body) => {
	if (err) console.log(err)
	else {
	    console.log("got image")
	    s3DurationMs = timeMs() - s3Start
	    yoloStart = timeMs()
	    request.post({
		uri: lookup('yolo'),
		json: {image: body.toString('base64')}
	    }, (err, res, body) => {
		if (err) console.log(err)
		else {
		    yoloDurationMs = timeMs() - yoloStart
		    infinispanStart = timeMs()
		    infinispan.client({host: infinispanHost,
				       port: infinispanPort},
				      {cacheName: 'txs'})
			.then(client => {
			    txId = swiftObj.object.split('.', 1)[0]
			    console.log("txId", txId)
			    client.get(txId).then(value => {
				tx = JSON.parse(value)
				console.log("tx", tx)
				return client.disconnect().then(() => {
				    infinispan.client({host: infinispanHost,
						       port: infinispanPort},
						      {cacheName: 'tasks'})
					.then(client => {
					    console.log("taskId", tx.taskId)
					    client.get(tx.taskId).then(value => {
						task = JSON.parse(value)
						console.log("task", task)
						return client.disconnect().then(() => {
						    infinispanDurationMs = timeMs() - infinispanStart
						    objects = new Set()
						    score = 0
						    body.forEach(obj => {
							console.log(obj.voc, obj.score)
							objects.add(obj.voc)
							if (obj.voc == task.object) {
							    console.log("found one")
							    score = task.point
							}
						    })
						    infinispan.client({host: infinispanHost,
								       port: infinispanPort},
								      {cacheName: 'objects'})
							.then(client => {
							    actionDurationMs = timeMs() - actionStart
							    value = {
								'score': score,
								'playerId': tx.playerId,
								'transactionId': txId,
								'data-center': tx['data-center'],
								'taskId': tx.taskId,
								'url': url,
								'objects': [...objects],
								'taskName': task.description,
								'taskObject': task.object,
								'action-duration-ms': actionDurationMs,
								'yolo-duration-ms': yoloDurationMs,
								's3-duration-ms': s3DurationMs,
								'infinispan-duration-ms': infinispanDurationMs,
								'action-overhead-ms': actionDurationMs - yoloDurationMs - s3DurationMs - infinispanDurationMs
							    }
							    client.put(txId, JSON.stringify(value))
								.then(() => {
								    return client.disconnect()
								})
							})
						})
					    })
					})
				})
			    })
			})
		}
	    })
	}
    })
}

if (require.main === module) {
    main(process.argv.length > 2 ? JSON.parse(process.argv[2]) : {})
}
