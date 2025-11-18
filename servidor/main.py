from servidor import ServidorModBus

if __name__ == "__main__":
    
    servidor = ServidorModBus(host_ip="localhost", porta=502)
    
    servidor.run(sleep_time=5)