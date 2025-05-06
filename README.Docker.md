### Building and running the application

Start the application by running, you may choose to replace `docker/development/docker-compose.yml` with `docker/production/docker-compose.yml` if you want to run the production version of the application.

```bash
docker compose --project-directory ./ -f docker/development/docker-compose.yml --env-file docker/development/.env up --build --remove-orphans
```

Add a `--detach` flag at the end to run it in detached mode.

- For `docker/developement`, see `docker/development/README.md` for which port the application is running on.
- For `docker/production`, the application will be reverse proxied by Caddy directly inside the container, so you can only access it via the domain name you set up in your Caddyfile.

### Deploying your application to the cloud

First, build your image, e.g.: `docker build -t myapp .`.
If your cloud uses a different CPU architecture than your development
machine (e.g., you are on a Mac M1 and your cloud provider is amd64),
you'll want to build the image for that platform, e.g.:
`docker build --platform=linux/amd64 -t myapp .`.

Then, push it to your registry, e.g. `docker push myregistry.com/myapp`.

Consult Docker's [getting started](https://docs.docker.com/go/get-started-sharing/)
docs for more detail on building and pushing.

### References
* [Docker's Python guide](https://docs.docker.com/language/python/)
