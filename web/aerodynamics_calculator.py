"""
空气动力学参数计算工具
基于NASA US Standard Atmosphere 1976模型

输入: 高度 (m) 和 马赫数
输出: 大气参数、总温总压、动压等气动参数
"""

import math
from typing import Tuple, Dict, Optional

# 物理常数
R = 287.052  # 干空气气体常数 J/(kg·K)
GAMMA = 1.4  # 空气比热容比 (绝热指数)
G = 9.80665  # 标准重力加速度 m/s²
SEA_LEVEL_PRESSURE = 101325.0  # 海平面标准大气压 Pa
SEA_LEVEL_TEMPERATURE = 288.15  # 海平面标准温度 K
SEA_LEVEL_DENSITY = 1.225  # 海平面标准密度 kg/m³
EARTH_RADIUS = 6371000.0  # 地球半径 m
SCALE_HEIGHT = 8500.0  # 标高 m


class AtmosphereModel:
    """NASA US Standard Atmosphere 1976 大气模型"""
    
    # 大气分层数据 [高度上限(m), 该层顶温度(K), 温度梯度(K/m), 气体常数]
    # 基于 NASA US Standard Atmosphere 1976
    # 每个元组表示：从上一个高度到该高度，温度从 T_at_previous 到 T 的变化
    LAYERS = [
        (11000, 216.65, -0.0065, R),       # 0-11km: 288.15K -> 216.65K
        (20000, 216.65, 0.0, R),           # 11-20km: 等温 216.65K
        (32000, 228.65, 0.001, R),         # 20-32km: 216.65K -> 228.65K
        (47000, 270.65, 0.0028, R),        # 32-47km: 228.65K -> 270.65K
        (51000, 270.65, 0.0, R),           # 47-51km: 等温 270.65K
        (71000, 214.65, -0.0028, R),       # 51-71km: 270.65K -> 214.65K
        (80000, 196.65, -0.002, R),        # 71-80km: 214.65K -> 196.65K
        (90000, 196.65, 0.0, R),           # 80-90km: 等温 196.65K
        (110000, 186.87, 0.002, R),        # 90-110km: 196.65K -> 186.87K
    ]
    
    @classmethod
    def get_layer(cls, altitude: float) -> Tuple[float, float, float, float]:
        """获取指定高度所在的大气层参数"""
        if altitude < 0:
            altitude = 0
            
        for i, (h_top, T_top, dT_dh, R_layer) in enumerate(cls.LAYERS):
            if altitude <= h_top:
                if i == 0:
                    return (0.0, SEA_LEVEL_TEMPERATURE, dT_dh, R_layer)
                else:
                    h_bottom = cls.LAYERS[i-1][0]
                    T_bottom = cls.LAYERS[i-1][1]
                    return (h_bottom, T_bottom, dT_dh, R_layer)
        # 超出定义范围，使用最后一层
        return (90000, 196.65, 0.0, R)
    
    @classmethod
    def temperature(cls, altitude: float) -> float:
        """
        计算静态温度 (K)
        基于NASA标准大气模型
        """
        if altitude < 0:
            altitude = 0
        
        if altitude == 0:
            return SEA_LEVEL_TEMPERATURE
        
        # 从海平面开始迭代
        T = SEA_LEVEL_TEMPERATURE
        h_prev = 0
        
        for h_top, T_top, dT_dh, _ in cls.LAYERS:
            if altitude <= h_top:
                # 在这一层内
                h = altitude - h_prev
                if abs(dT_dh) > 1e-10:
                    T = T + dT_dh * h
                break
            
            # 跨越这一层
            h = h_top - h_prev
            if abs(dT_dh) > 1e-10:
                T = T + dT_dh * h
            else:
                T = T_top
            
            h_prev = h_top
        
        return T
    
    @classmethod
    def pressure(cls, altitude: float) -> float:
        """
        计算静态压力 (Pa)
        基于气压公式积分
        """
        if altitude < 0:
            altitude = 0
        
        if altitude == 0:
            return SEA_LEVEL_PRESSURE
        
        # 迭代从海平面向上积分
        p = SEA_LEVEL_PRESSURE
        h_prev = 0
        T_prev = SEA_LEVEL_TEMPERATURE
        
        for h_top, T_top, dT_dh, R_layer in cls.LAYERS:
            if altitude <= h_top:
                # 在这一层内
                h = altitude - h_prev
                if abs(dT_dh) < 1e-10:  # 等温层
                    p = p * math.exp(-G * h / (R_layer * T_prev))
                else:
                    T_curr = T_prev + dT_dh * h
                    if T_curr > 0:
                        p = p * (T_curr / T_prev) ** (-G / (R_layer * dT_dh))
                break
            
            # 跨越这一层
            h = h_top - h_prev
            if abs(dT_dh) < 1e-10:
                p = p * math.exp(-G * h / (R_layer * T_prev))
            else:
                T_curr = T_prev + dT_dh * h
                if T_curr > 0:
                    p = p * (T_curr / T_prev) ** (-G / (R_layer * dT_dh))
            
            h_prev = h_top
            T_prev = T_top
        
        return p
    
    @classmethod
    def density(cls, altitude: float) -> float:
        """
        计算静态密度 (kg/m³)
        使用理想气体状态方程
        """
        T = cls.temperature(altitude)
        p = cls.pressure(altitude)
        return p / (R * T)
    
    @classmethod
    def speed_of_sound(cls, altitude: float) -> float:
        """
        计算当地声速 (m/s)
        a = sqrt(gamma * R * T)
        """
        T = cls.temperature(altitude)
        return math.sqrt(GAMMA * R * T)
    
    @classmethod
    def dynamic_viscosity(cls, altitude: float) -> float:
        """
        计算动力粘度 (Pa·s)
        使用Sutherland公式
        """
        T = cls.temperature(altitude)
        # Sutherland公式系数
        mu_ref = 1.716e-5  # 参考粘度 Pa·s
        T_ref = 273.15      # 参考温度 K
        S = 110.4          # Sutherland温度 K
        
        return mu_ref * ((T / T_ref) ** 1.5) * ((T_ref + S) / (T + S))
    
    @classmethod
    def kinematic_viscosity(cls, altitude: float) -> float:
        """计算运动粘度 (m²/s)"""
        mu = cls.dynamic_viscosity(altitude)
        rho = cls.density(altitude)
        return mu / rho
    
    @classmethod
    def reynolds_number(cls, altitude: float, velocity: float, length: float) -> float:
        """计算雷诺数"""
        rho = cls.density(altitude)
        mu = cls.dynamic_viscosity(altitude)
        return rho * velocity * length / mu


class AerodynamicsCalculator:
    """空气动力学参数计算器"""
    
    def __init__(self, altitude: float, mach: float):
        """
        初始化计算器
        
        Args:
            altitude: 飞行高度 (m)
            mach: 马赫数
        """
        self.altitude = altitude
        self.mach = mach
        self.atmosphere = AtmosphereModel()
        
        # 计算基本大气参数
        self.T = self.atmosphere.temperature(altitude)      # 静态温度
        self.p = self.atmosphere.pressure(altitude)        # 静态压力
        self.rho = self.atmosphere.density(altitude)       # 静态密度
        self.a = self.atmosphere.speed_of_sound(altitude)  # 声速
        self.mu = self.atmosphere.dynamic_viscosity(altitude)  # 动力粘度
        self.nu = self.atmosphere.kinematic_viscosity(altitude)  # 运动粘度
        
        # 计算飞行速度
        self.V = self.mach * self.a
        
        # 总温总压
        self.total_temperature = self._total_temperature()
        self.total_pressure = self._total_pressure()
        
        # 动压
        self.q = self._dynamic_pressure()
        
        # 雷诺数 / 米
        self.reynolds_per_meter = self._reynolds_per_meter()
    
    def _total_temperature(self) -> float:
        """
        计算总温 (Stagnation Temperature) (K)
        T0 = T * (1 + (gamma-1)/2 * M²)
        """
        return self.T * (1 + (GAMMA - 1) / 2 * self.mach ** 2)
    
    def _total_pressure(self) -> float:
        """
        计算总压 (Stagnation Pressure) (Pa)
        P0 = P * (1 + (gamma-1)/2 * M²)^(gamma/(gamma-1))
        """
        exponent = GAMMA / (GAMMA - 1)
        return self.p * (1 + (GAMMA - 1) / 2 * self.mach ** 2) ** exponent
    
    def _dynamic_pressure(self) -> float:
        """
        计算动压 (Dynamic Pressure) (Pa)
        q = 0.5 * rho * V²
        """
        return 0.5 * self.rho * self.V ** 2
    
    def _reynolds_per_meter(self) -> float:
        """计算每米雷诺数"""
        return self.rho * self.V / self.mu
    
    def get_results(self) -> Dict[str, float]:
        """
        获取所有计算结果
        
        Returns:
            包含所有参数的字典
        """
        return {
            # === 输入参数 ===
            "altitude_m": self.altitude,
            "altitude_km": self.altitude / 1000.0,
            "mach_number": self.mach,
            
            # === 大气环境参数 ===
            "static_temperature_K": round(self.T, 4),
            "static_temperature_C": round(self.T - 273.15, 4),
            "static_pressure_Pa": round(self.p, 2),
            "static_pressure_kPa": round(self.p / 1000.0, 4),
            "static_pressure_atm": round(self.p / SEA_LEVEL_PRESSURE, 6),
            "density_kg_m3": round(self.rho, 6),
            "speed_of_sound_m_s": round(self.a, 4),
            
            # === 飞行参数 ===
            "velocity_m_s": round(self.V, 4),
            "velocity_km_h": round(self.V * 3.6, 4),
            
            # === 总温总压 ===
            "total_temperature_K": round(self.total_temperature, 4),
            "total_temperature_C": round(self.total_temperature - 273.15, 4),
            "total_pressure_Pa": round(self.total_pressure, 2),
            "total_pressure_kPa": round(self.total_pressure / 1000.0, 4),
            "total_pressure_atm": round(self.total_pressure / SEA_LEVEL_PRESSURE, 6),
            
            # === 动压 ===
            "dynamic_pressure_Pa": round(self.q, 2),
            "dynamic_pressure_kPa": round(self.q / 1000.0, 4),
            
            # === 粘性参数 ===
            "dynamic_viscosity_Pa_s": round(self.mu, 8),
            "kinematic_viscosity_m2_s": round(self.nu, 10),
            
            # === 雷诺数 ===
            "reynolds_number_per_m": round(self.reynolds_per_meter, 2),
        }
    
    def get_results_detailed(self) -> Dict[str, any]:
        """获取详细结果（含单位说明）"""
        results = self.get_results()
        units = {
            "altitude_m": "米 (m)",
            "altitude_km": "千米 (km)",
            "mach_number": "无量纲",
            "static_temperature_K": "开尔文 (K)",
            "static_temperature_C": "摄氏度 (°C)",
            "static_pressure_Pa": "帕斯卡 (Pa)",
            "static_pressure_kPa": "千帕 (kPa)",
            "static_pressure_atm": "标准大气压 (atm)",
            "density_kg_m3": "千克/立方米 (kg/m³)",
            "speed_of_sound_m_s": "米/秒 (m/s)",
            "velocity_m_s": "米/秒 (m/s)",
            "velocity_km_h": "千米/时 (km/h)",
            "total_temperature_K": "开尔文 (K)",
            "total_temperature_C": "摄氏度 (°C)",
            "total_pressure_Pa": "帕斯卡 (Pa)",
            "total_pressure_kPa": "千帕 (kPa)",
            "total_pressure_atm": "标准大气压 (atm)",
            "dynamic_pressure_Pa": "帕斯卡 (Pa)",
            "dynamic_pressure_kPa": "千帕 (kPa)",
            "dynamic_viscosity_Pa_s": "帕·秒 (Pa·s)",
            "kinematic_viscosity_m2_s": "平方米/秒 (m²/s)",
            "reynolds_number_per_m": "1/米 (1/m)",
        }
        
        descriptions = {
            "altitude_m": "飞行高度",
            "altitude_km": "飞行高度",
            "mach_number": "马赫数（飞行速度与当地声速之比）",
            "static_temperature_K": "静态温度（未受流压缩的温度）",
            "static_temperature_C": "静态温度（摄氏度）",
            "static_pressure_Pa": "静态压力（大气压）",
            "static_pressure_kPa": "静态压力（千帕）",
            "static_pressure_atm": "静态压力（标准大气压倍数）",
            "density_kg_m3": "空气密度",
            "speed_of_sound_m_s": "当地声速",
            "velocity_m_s": "飞行速度",
            "velocity_km_h": "飞行速度",
            "total_temperature_K": "总温（等熵滞止温度）",
            "total_temperature_C": "总温（摄氏度）",
            "total_pressure_Pa": "总压（等熵滞止压力）",
            "total_pressure_kPa": "总压（千帕）",
            "total_pressure_atm": "总压（标准大气压倍数）",
            "dynamic_pressure_Pa": "动压（0.5ρV²）",
            "dynamic_pressure_kPa": "动压（千帕）",
            "dynamic_viscosity_Pa_s": "动力粘度（Sutherland公式）",
            "kinematic_viscosity_m2_s": "运动粘度",
            "reynolds_number_per_m": "每米雷诺数（Re/m = ρV/μ）",
        }
        
        detailed = {}
        for key, value in results.items():
            detailed[key] = {
                "value": value,
                "unit": units.get(key, ""),
                "description": descriptions.get(key, ""),
            }
        
        return detailed
    
    def print_summary(self):
        """打印结果摘要"""
        r = self.get_results()
        
        print("=" * 60)
        print("        空气动力学参数计算结果")
        print("        基于 NASA US Standard Atmosphere 1976")
        print("=" * 60)
        print()
        print("【输入参数】")
        print(f"  高度: {r['altitude_km']:.2f} km ({r['altitude_m']:.0f} m)")
        print(f"  马赫数: {r['mach_number']:.3f}")
        print()
        print("【大气环境参数】")
        print(f"  静态温度: {r['static_temperature_K']:.2f} K ({r['static_temperature_C']:.2f} °C)")
        print(f"  静态压力: {r['static_pressure_Pa']:.2f} Pa = {r['static_pressure_kPa']:.4f} kPa = {r['static_pressure_atm']:.4f} atm")
        print(f"  空气密度: {r['density_kg_m3']:.6f} kg/m³")
        print(f"  当地声速: {r['speed_of_sound_m_s']:.2f} m/s")
        print()
        print("【飞行参数】")
        print(f"  飞行速度: {r['velocity_m_s']:.2f} m/s = {r['velocity_km_h']:.2f} km/h")
        print()
        print("【总温总压】")
        print(f"  总温 T0: {r['total_temperature_K']:.2f} K ({r['total_temperature_C']:.2f} °C)")
        print(f"  总压 P0: {r['total_pressure_Pa']:.2f} Pa = {r['total_pressure_kPa']:.4f} kPa = {r['total_pressure_atm']:.4f} atm")
        print()
        print("【动压】")
        print(f"  动压 q: {r['dynamic_pressure_Pa']:.2f} Pa = {r['dynamic_pressure_kPa']:.4f} kPa")
        print()
        print("【粘性参数】")
        print(f"  动力粘度: {r['dynamic_viscosity_Pa_s']:.2e} Pa·s")
        print(f"  运动粘度: {r['kinematic_viscosity_m2_s']:.2e} m²/s")
        print()
        print("【雷诺数】")
        print(f"  每米雷诺数: {r['reynolds_number_per_m']:.2e} 1/m")
        print()
        print("=" * 60)


def calculate_aerodynamics(altitude: float, mach: float) -> Dict[str, float]:
    """
    便捷函数：计算空气动力学参数
    
    Args:
        altitude: 飞行高度 (m)
        mach: 马赫数
    
    Returns:
        包含所有参数的字典
    """
    calc = AerodynamicsCalculator(altitude, mach)
    return calc.get_results()


def generate_data_table(altitudes: list, machs: list) -> list:
    """
    生成参数表
    
    Args:
        altitudes: 高度列表 (m)
        machs: 马赫数列表
    
    Returns:
        包含所有组合结果的列表
    """
    results = []
    for alt in altitudes:
        for mach in machs:
            calc = AerodynamicsCalculator(alt, mach)
            r = calc.get_results()
            r["altitude_km"] = alt / 1000.0
            results.append(r)
    return results


# 示例数据表：常用高度-马赫数组合
EXAMPLE_CONDITIONS = [
    # (高度km, 马赫数, 描述)
    (0, 0.3, "起飞"),
    (0, 0.85, "亚音速客机巡航"),
    (0, 0.95, "接近音障"),
    (1, 0.8, "低空亚音速"),
    (5, 0.85, "对流层顶"),
    (10, 1.2, "超音速巡航"),
    (10, 2.0, "2倍音速"),
    (15, 2.5, "高超音速"),
    (20, 3.0, "3倍音速"),
    (25, 5.0, "5倍音速"),
    (30, 6.0, "6倍音速"),
    (40, 8.0, "8倍音速"),
    (50, 10.0, "10倍音速"),
]


if __name__ == "__main__":
    # 示例1：单点计算
    print("\n" + "="*60)
    print("示例1: 单点计算 (高度 12km, 马赫 2.0)")
    print("="*60)
    calc = AerodynamicsCalculator(12000, 2.0)
    calc.print_summary()
    
    # 示例2：生成数据表
    print("\n" + "="*60)
    print("示例2: 常用飞行条件数据表")
    print("="*60)
    
    # 打印表头
    header = f"{'高度(km)':>8} {'马赫':>6} {'T(K)':>8} {'P(kPa)':>10} {'ρ(kg/m³)':>12} {'a(m/s)':>8} {'V(m/s)':>10} {'T0(K)':>8} {'P0(kPa)':>10} {'动压(kPa)':>10}"
    print(header)
    print("-" * len(header))
    
    for alt_km, mach, desc in EXAMPLE_CONDITIONS:
        calc = AerodynamicsCalculator(alt_km * 1000, mach)
        r = calc.get_results()
        row = f"{r['altitude_km']:>8.1f} {r['mach_number']:>6.2f} {r['static_temperature_K']:>8.2f} {r['static_pressure_kPa']:>10.4f} {r['density_kg_m3']:>12.6f} {r['speed_of_sound_m_s']:>8.2f} {r['velocity_m_s']:>10.2f} {r['total_temperature_K']:>8.2f} {r['total_pressure_kPa']:>10.4f} {r['dynamic_pressure_kPa']:>10.4f}"
        print(row)
    
    print("\n" + "="*60)
    print("计算完成!")
    print("="*60)
