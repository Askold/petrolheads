# Background removal service (https://github.com/danielgatis/rembg), CPU only.
# POST /api/remove (multipart "file") -> PNG with transparent background.
FROM python:3.12-slim

RUN pip install --no-cache-dir "rembg[cpu,cli]==2.0.85"

ARG MODEL=isnet-general-use
ENV U2NET_HOME=/models
# Bake the model into the image so the first request doesn't download it.
RUN rembg d ${MODEL}

# pymatting JIT-compiles with numba cache=True and writes the cache next to its sources,
# so that directory must be writable by the runtime user. Warm the cache at build time.
RUN useradd --system app && chown -R app /models /usr/local/lib/python3.12/site-packages/pymatting
USER app
RUN python -c "import rembg.bg"
EXPOSE 7000
CMD ["rembg", "s", "--host", "0.0.0.0", "--port", "7000", "--threads", "1"]
