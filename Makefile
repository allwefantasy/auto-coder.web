.PHONY: release
release: ## Build and package web assets
	rm -rf build && mkdir -p build
	rm -rf dist && mkdir -p dist	
	rm -rf frontend/build
	cd frontend && npm install && npm run build
	tar -czf web.static.tar.gz -C frontend/build .
	rm -rf src/auto_coder_web/web && mkdir -p src/auto_coder_web/web	
	mv web.static.tar.gz src/auto_coder_web/web/	
	cd src/auto_coder_web/web/ && tar -xzf web.static.tar.gz && rm web.static.tar.gz
	./deploy.sh && pip install -e .

.PHONY: docker-build
docker-build: ## Build docker images
	scp -r docker/* remote:/home/winubuntu/auto-coder-web-docker/
