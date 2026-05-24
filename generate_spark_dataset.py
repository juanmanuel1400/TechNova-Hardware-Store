#!/usr/bin/env python3
import os
import subprocess
import json
import csv

def run_simulation():
    print("======================================================================")
    print(" GENERACIÓN DE DATASETS TECHNOVA")
    print("======================================================================")
    
    # 1. Rutas dinámicas relativas a la ubicación de este script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    k6_binary = os.path.abspath(os.path.join(script_dir, "..", "k6-bin", "k6"))
    k6_script = os.path.abspath(os.path.join(script_dir, "simulacion_trafico.js"))
    datasets_dir = os.path.abspath(os.path.join(script_dir, "..", "datasets"))
    
    # Asegurar que existe la carpeta de datasets
    os.makedirs(datasets_dir, exist_ok=True)
    print(f" Carpeta de datasets verificada o creada en: {datasets_dir}")

    json_output_path = os.path.join(datasets_dir, "events.json")
    csv_output_path = os.path.join(datasets_dir, "events.csv")

    if not os.path.exists(k6_binary):
        print(f"Error: El binario de k6 no se encuentra en {k6_binary}")
        return

    if not os.path.exists(k6_script):
        print(f"Error: El script de simulación {k6_script} no existe")
        return

    print("Ejecutando prueba de tráfico k6 contra Kubernetes...")

    
    # 3. Ejecutar k6 y capturar la salida estándar
    process = subprocess.Popen(
        [k6_binary, "run", k6_script],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )

    events = []
    
    # 4. Procesar la salida línea por línea en tiempo real
    while True:
        line = process.stdout.readline()
        if not line and process.poll() is not None:
            break
        
        # Si es un evento de negocio, lo extraemos con una lógica robusta ante escapes de k6
        if "[BIZ_EVENT]" in line:
            first_brace = line.find('{')
            last_brace = line.rfind('}')
            if first_brace != -1 and last_brace != -1:
                raw_json = line[first_brace:last_brace+1]
                # k6 escapa comillas dobles en el output msg="..." de log, las des-escapamos:
                cleaned_json = raw_json.replace('\\"', '"').replace('\\\\"', '\\"')
                try:
                    event_json = json.loads(cleaned_json)
                    events.append(event_json)
                except Exception as e:
                    print(f"\nError decodificando evento: {e}")
                    print(f"   Original: {line.strip()}")
                    print(f"   Cleaned: {cleaned_json}")

    process.wait()
    print("\n Simulación completada exitosamente.")
    print(f"Total de eventos de negocio capturados: {len(events)}")

    if len(events) == 0:
        print(" Advertencia: No se capturaron eventos. Verifica la conexión con los microservicios.")
        return

    # 5. Escribir Dataset en formato JSON Lines (JSONL) para Spark
    print(f" Guardando dataset en JSON Lines: {json_output_path}...")
    with open(json_output_path, "w", encoding="utf-8") as json_file:
        for event in events:
            json_file.write(json.dumps(event) + "\n")
    print(f"   - Archivo JSONL creado con éxito ({os.path.getsize(json_output_path)} bytes).")

    # 6. Escribir Dataset en formato CSV unificado
    print(f" Guardando dataset en CSV: {csv_output_path}...")
    
    # Extraer todas las llaves posibles para las columnas del CSV (de forma dinámica)
    headers = set()
    for event in events:
        headers.update(event.keys())
    
    # Organizar columnas para que se vean bonitas
    headers = list(headers)
    if "timestamp" in headers:
        headers.remove("timestamp")
    if "event_type" in headers:
        headers.remove("event_type")
    headers = ["timestamp", "event_type"] + sorted(headers)

    with open(csv_output_path, "w", encoding="utf-8", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=headers, restval=None)
        writer.writeheader()
        for event in events:
            writer.writerow(event)
            
    print(f"   - Archivo CSV creado con éxito ({os.path.getsize(csv_output_path)} bytes).")
    print("======================================================================")
    print("¡PROCESO FINALIZADO CON ÉXITO!")
    print(f"Dataset JSONL disponible en: {os.path.abspath(json_output_path)}")
    print(f"Dataset CSV disponible en:   {os.path.abspath(csv_output_path)}")
    print("======================================================================")

if __name__ == "__main__":
    run_simulation()
