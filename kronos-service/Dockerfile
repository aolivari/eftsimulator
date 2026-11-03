FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/opt/hf \
    PORT=8080

# Código del modelo Kronos (MIT), fijado a un commit concreto
ARG KRONOS_COMMIT=67b630e67f6a18c9e9be918d9b4337c960db1e9a
RUN apt-get update && apt-get install -y --no-install-recommends git \
    && git clone https://github.com/shiyu-coder/Kronos /opt/kronos \
    && git -C /opt/kronos checkout ${KRONOS_COMMIT} \
    && rm -rf /opt/kronos/.git \
    && apt-get purge -y git && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# PyTorch solo CPU (mucho más ligero que la build con CUDA)
RUN pip install --no-cache-dir torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

ENV PYTHONPATH=/opt/kronos

# Descargar los pesos durante el build para que el arranque en frío no dependa de Hugging Face
RUN python -c "from model import Kronos, KronosTokenizer; \
KronosTokenizer.from_pretrained('NeoQuasar/Kronos-Tokenizer-2k'); \
KronosTokenizer.from_pretrained('NeoQuasar/Kronos-Tokenizer-base'); \
Kronos.from_pretrained('NeoQuasar/Kronos-mini'); \
Kronos.from_pretrained('NeoQuasar/Kronos-small'); \
Kronos.from_pretrained('NeoQuasar/Kronos-base')"

COPY app.py .

CMD exec uvicorn app:app --host 0.0.0.0 --port ${PORT} --workers 1
