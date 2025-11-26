import time
import random

from pyModbusTCP.server import ModbusServer
from pyModbusTCP.utils import encode_ieee, long_list_to_word


class ServidorModBus:
    def __init__(self, host_ip: str, porta: int) -> None:
        self._server = ModbusServer(host=host_ip, port=porta, no_block=True)

    def run(self, sleep_time: int = 2) -> None:
        print("Iniciando servidor Modbus TCP...")
        self._server.start()
        print(f"\nServidor Modbus TCP iniciado em {self._server.host}:{self._server.port}")

        while True:

            # =======================================================
            #           GERAÇÃO DE DADOS PARA OS DOIS FORNOS
            # =======================================================

            # -------- Furnace 1 --------
            f1_temp_z1 = random.uniform(700, 900)
            f1_temp_z2 = random.uniform(700, 900)
            f1_temp_z3 = random.uniform(700, 900)
            f1_fuel = random.choice([0, 1])         # ligado/desligado
            f1_setpoint = random.uniform(750, 850)
            f1_mode = random.choice([1, 2])         # 1=automático, 2=manual

            # -------- Furnace 2 --------
            f2_temp_z1 = random.uniform(700, 900)
            f2_temp_z2 = random.uniform(700, 900)
            f2_temp_z3 = random.uniform(700, 900)
            f2_fuel = random.choice([0, 1])
            f2_setpoint = random.uniform(750, 850)
            f2_mode = random.choice([1, 2])


            # =======================================================
            #           PRINT PARA DEPURAÇÃO (MODELO DO ROBSON)
            # =======================================================

            print("\n===== DADOS GERADOS (MODBUS) =====")
            print("FURNACE 1:")
            print(f"  Z1: {f1_temp_z1:.2f} °C")
            print(f"  Z2: {f1_temp_z2:.2f} °C")
            print(f"  Z3: {f1_temp_z3:.2f} °C")
            print(f"  Combustível: {'Ligado' if f1_fuel else 'Desligado'}")
            print(f"  Setpoint: {f1_setpoint:.2f}")
            print(f"  Modo: {'Automático' if f1_mode else 'Manual'}")

            print("\nFURNACE 2:")
            print(f"  Z1: {f2_temp_z1:.2f} °C")
            print(f"  Z2: {f2_temp_z2:.2f} °C")
            print(f"  Z3: {f2_temp_z3:.2f} °C")
            print(f"  Combustível: {'Ligado' if f2_fuel else 'Desligado'}")
            print(f"  Setpoint: {f2_setpoint:.2f}")
            print(f"  Modo: {'Automático' if f2_mode else 'Manual'}")


            # =======================================================
            #           CONVERSÃO IEEE 754 PARA FLOAT (MODELO ROBSON)
            # =======================================================

            def encode_float(value):
                ieee = encode_ieee(value)
                return long_list_to_word([ieee])

            # =======================================================
            #           ESCRITA NOS REGISTRADORES HOLDING
            # =======================================================
            # Você poderá ler esses registradores pela FastAPI
            # e gravar no SQLite via FurnaceDAO

            # Endereçamento sugerido:
            # Furnace 1 → 1000–1009
            # Furnace 2 → 1100–1109

            # Furnace 1
            self._server.data_bank.set_holding_registers(1000, encode_float(f1_temp_z1))
            self._server.data_bank.set_holding_registers(1002, encode_float(f1_temp_z2))
            self._server.data_bank.set_holding_registers(1004, encode_float(f1_temp_z3))
            self._server.data_bank.set_holding_registers(1006, [f1_fuel])
            self._server.data_bank.set_holding_registers(1007, encode_float(f1_setpoint))
            self._server.data_bank.set_holding_registers(1009, [f1_mode])

            # Furnace 2
            self._server.data_bank.set_holding_registers(1100, encode_float(f2_temp_z1))
            self._server.data_bank.set_holding_registers(1102, encode_float(f2_temp_z2))
            self._server.data_bank.set_holding_registers(1104, encode_float(f2_temp_z3))
            self._server.data_bank.set_holding_registers(1106, [f2_fuel])
            self._server.data_bank.set_holding_registers(1107, encode_float(f2_setpoint))
            self._server.data_bank.set_holding_registers(1109, [f2_mode])

            time.sleep(sleep_time)
