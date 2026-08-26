#!/usr/bin/env python3
import os
import sys
import json
import asyncio
import subprocess

# 1. Asegurar entorno virtual e instalar dependencias si faltan
def setup_venv():
    root = os.path.dirname(os.path.abspath(__file__))
    venv_dir = os.path.join(root, ".venv")
    
    if sys.platform == "win32":
        python_bin = os.path.join(venv_dir, "Scripts", "python.exe")
        pip_bin = os.path.join(venv_dir, "Scripts", "pip.exe")
    else:
        python_bin = os.path.join(venv_dir, "bin", "python")
        pip_bin = os.path.join(venv_dir, "bin", "pip")

    if not os.path.exists(venv_dir):
        print("[System] Creando entorno virtual de Python...", file=sys.stderr)
        subprocess.run([sys.executable, "-m", "venv", venv_dir], check=True)

    # Validar dependencias instaladas
    try:
        subprocess.run([python_bin, "-c", "import browser_use, langchain_openai"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except subprocess.CalledProcessError:
        print("[System] Instalando browser-use y dependencias de LangChain...", file=sys.stderr)
        subprocess.run([pip_bin, "install", "--upgrade", "pip"], check=True)
        subprocess.run([pip_bin, "install", "browser-use", "langchain-openai", "langchain-anthropic", "langchain-google-genai", "playwright"], check=True)
        # Instalar navegadores de playwright
        print("[System] Descargando binario de Chromium para Playwright...", file=sys.stderr)
        subprocess.run([python_bin, "-m", "playwright", "install", "chromium"], check=True)

    # Relanzar el script usando el Python del entorno virtual
    if sys.executable != python_bin:
        os.execv(python_bin, [python_bin] + sys.argv)

# Ejecutar el setup inicial del entorno
setup_venv()

from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from browser_use import Agent, Controller

# Resolver el LLM correspondiente según el proveedor seleccionado en Stark
def get_llm(provider, model, api_key, base_url):
    if provider == "anthropic":
        return ChatAnthropic(
            model=model,
            api_key=api_key
        )
    elif provider == "gemini":
        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=api_key
        )
    else:
        # Por defecto usar interfaz compatible con OpenAI (incluyendo Ollama, OpenRouter, etc.)
        return ChatOpenAI(
            model=model,
            api_key=api_key or "noop",
            base_url=base_url or "https://api.openai.com/v1"
        )

async def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Debe proporcionar los parámetros de la tarea en formato JSON."}))
        sys.exit(1)

    try:
        params = json.loads(sys.argv[1])
    except Exception as e:
        print(json.dumps({"error": f"JSON inválido: {e}"}))
        sys.exit(1)

    task = params.get("task")
    provider = params.get("provider", "openai")
    model = params.get("model", "gpt-4o")
    api_key = params.get("api_key")
    base_url = params.get("base_url")

    llm = get_llm(provider, model, api_key, base_url)
    
    controller = Controller()

    # Cada paso de browser-use reportará el screenshot y la acción tomada
    agent = Agent(
        task=task,
        llm=llm,
        controller=controller,
        use_vision=True
    )

    history = await agent.run()
    
    # Escribir resultado final
    print(json.dumps({
        "status": "done",
        "message": "Navegación completada",
        "final_result": history.final_result() if history else "Sin resultado"
    }))

if __name__ == "__main__":
    asyncio.run(main())
