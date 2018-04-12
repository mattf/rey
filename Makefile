zip:
	npm install
	zip -r action.zip package.json index.js config.json node_modules

deploy: zip
	wsk action update rey --kind nodejs:8 action.zip
