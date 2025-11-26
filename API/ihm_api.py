import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel

from furnace_dao import FurnaceDAO
from cliente import ClienteModBus

from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException

# ============================================================
#   SCHEMA DO RETORNO (igual ao do Robson, mas com seus dados)
# ============================================================
class FurnaceData(BaseModel):
    f1_temp_zone1: float
    f1_temp_zone2: float
    f1_temp_zone3: float
    f1_fuel_state: int
    f1_setpoint: float
    f1_mode_operation: int
    f2_temp_zone1: float
    f2_temp_zone2: float
    f2_temp_zone3: float
    f2_fuel_state: int
    f2_setpoint: float
    f2_mode_operation: int
    timestamp: str


# ============================================================
#   FASTAPI
# ============================================================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
#   CONFIGURAÇÃO DO CLIENTE MODBUS (COM OS SEUS DADOS)
# ============================================================
cliente = ClienteModBus(
    server_ip="localhost",
    porta=502,
    tags_address={
        "f1_temp_zone1": 1000,
        "f1_temp_zone2": 1002,
        "f1_temp_zone3": 1004,
        "f1_fuel_state": 1006,
        "f1_setpoint": 1007,
        "f1_mode_operation": 1009,
        "f2_temp_zone1": 1010,
        "f2_temp_zone2": 1012,
        "f2_temp_zone3": 1014,
        "f2_fuel_state": 1016,
        "f2_setpoint": 1017,
        "f2_mode_operation": 1019,
    },
    read_time=5,
    db_path="furnaces_database.db"
)


FurnaceDB = FurnaceDAO("furnaces_database.db")


# ============================================================
#   ROTA INICIAL
# ============================================================
@app.get("/")
def init():
    return "Web Service - Sistema de Supervisão dos Fornos de Reaquecimento"


# ============================================================
#   ROTA PRINCIPAL — RETORNO DO ÚLTIMO DADO DA TABELA
#   (modelo do Robson, porém usando seu DAO e suas tags)
# ============================================================
@app.get("/furnace_data")
def get_last_data():

    # Lê do Modbus e insere uma linha no banco
    cliente.read_once()

    # Busca o último registro (DAO seu, não do Robson)
    row = FurnaceDB.get_last_furnace_data()

    if row is None:
        return {
            "f1_temp_zone1": None,
            "f1_temp_zone2": None,
            "f1_temp_zone3": None,
            "f1_fuel_state": None,
            "f1_setpoint": None,
            "f1_mode_operation": None,
            "f2_temp_zone1": None,
            "f2_temp_zone2": None,
            "f2_temp_zone3": None,
            "f2_fuel_state": None,
            "f2_setpoint": None,
            "f2_mode_operation": None,
            "timestamp": None
        }

    return row

# ============================================================
#   POST SETPOINT (somente manual)
# ============================================================
@app.post("/setpoint")
def set_setpoint(payload: dict):
    forno = payload.get("forno")
    sp = payload.get("setpoint")

    if forno not in [1, 2]:
        raise HTTPException(400, "Forno inválido.")

    setpoint_addr = 1007 if forno == 1 else 1017
    mode_addr = 1009 if forno == 1 else 1019

    modo = cliente.read_holding_registers(mode_addr, 1).registers[0]

    if modo == 1:
        raise HTTPException(403, "Modo automático — alteração bloqueada.")

    cliente.write_register(setpoint_addr, int(sp))

    return {"status": "ok"}


# ============================================================
#   POST MODO
# ============================================================
@app.post("/mode")
def change_mode(payload: dict):
    forno = payload.get("forno")
    modo = payload.get("modo")  # 1 auto | 2 manual

    if forno not in [1, 2]:
        raise HTTPException(400, "Forno inválido.")

    if modo not in [1, 2]:
        raise HTTPException(400, "Modo inválido.")

    mode_addr = 1009 if forno == 1 else 1019

    cliente.write_register(mode_addr, int(modo))

    return {"status": "ok"}

# ============================================================
#   EXECUÇÃO
# ============================================================
if __name__ == "__main__":
    uvicorn.run("ihm_api:app", port=8000, log_level="info", reload=True)
