"""
CFD（计算流体力学）参数计算器集
基于NASA标准大气模型

包含:
1. y+ 计算器 - 边界层网格设计
2. 附面层厚度计算器
3. 摩阻系数计算器
4. 升力/阻力计算器
5. 压力系数计算器
6. 雷诺数相关计算器
"""

import math
from aerodynamics_calculator import AerodynamicsCalculator, GAMMA, R, SEA_LEVEL_PRESSURE, SEA_LEVEL_TEMPERATURE


class YPlusCalculator:
    """
    y+ 计算器
    用于确定边界层第一层网格高度
    
    y+ = ρ * u* * y / μ = u* * y / ν
    其中 u* = 摩擦速度 = sqrt(τw/ρ)
    """
    
    # 湍流模型推荐的y+目标值
    Y_PLUS_TARGETS = {
        "standard_k_epsilon": 30,      # 标准k-ε
        "realizable_k_epsilon": 30,    # Realizable k-ε  
        "k_omega_sst": 1,             # k-omega SST (需要y+≈1)
        "sst": 1,
        "les": 1,                      # LES
        "dns": 1,                      # DNS
        "scalable_wall_function": 11,  # 可扩展壁面函数
    }
    
    @staticmethod
    def friction_velocity(tau_w: float, rho: float) -> float:
        """计算摩擦速度 u* = sqrt(τw/ρ)"""
        return math.sqrt(abs(tau_w) / rho) if rho > 0 else 0
    
    @staticmethod
    def wall_shear_stress(rho: float, u_star: float) -> float:
        """计算壁面剪切应力 τw = ρ * u*^2"""
        return rho * u_star ** 2
    
    @staticmethod
    def y_plus(y: float, rho: float, mu: float, u_star: float) -> float:
        """
        计算y+值
        y+: 无量纲距离
        """
        if mu <= 0:
            return 0
        nu = mu / rho
        return u_star * y / nu if nu > 0 else 0
    
    @staticmethod
    def first_layer_height(target_y_plus: float, u_star: float, nu: float) -> float:
        """
        计算第一层网格高度
        Δy = y+ * ν / u*
        """
        if u_star <= 0:
            return 0
        return target_y_plus * nu / u_star
    
    @staticmethod
    def calculate_from_velocity(velocity: float, rho: float, mu: float, 
                                chord_length: float = 1.0, 
                                model: str = "k_omega_sst") -> dict:
        """
        从已知速度计算y+相关参数
        
        使用平板公式近似（可推广到翼型）
        """
        nu = mu / rho  # 运动粘度
        
        # 使用平板摩阻公式估算cf (Schlichting近似)
        # Cf = 0.074 * Re_x^(-1/5) for turbulent
        Re_x = rho * velocity * chord_length / mu
        
        if Re_x < 5e5:
            # 层流
            cf = 1.328 / math.sqrt(Re_x)
        else:
            # 湍流 (Schlichting)
            cf = 0.074 * Re_x ** (-0.2)
        
        # 壁面剪切应力
        tau_w = 0.5 * cf * rho * velocity ** 2
        
        # 摩擦速度
        u_star = YPlusCalculator.friction_velocity(tau_w, rho)
        
        # 计算不同y+目标值对应的第一层网格高度
        first_layers = {}
        for model_name, target in YPlusCalculator.Y_PLUS_TARGETS.items():
            first_layers[model_name] = YPlusCalculator.first_layer_height(
                target, u_star, nu
            )
        
        return {
            "velocity_m_s": velocity,
            "density_kg_m3": rho,
            "viscosity_Pa_s": mu,
            "kinematic_viscosity_m2_s": nu,
            "reynolds_number": Re_x,
            "friction_coefficient": cf,
            "wall_shear_stress_Pa": tau_w,
            "friction_velocity_m_s": u_star,
            "first_layer_height": first_layers,
        }
    
    @staticmethod
    def calculate_from_mach(altitude: float, mach: float, chord_length: float = 1.0,
                           model: str = "k_omega_sst") -> dict:
        """
        从高度和马赫数计算y+参数
        """
        # 获取大气参数
        calc = AerodynamicsCalculator(altitude, mach)
        rho = calc.rho
        mu = calc.mu
        velocity = calc.V
        
        return YPlusCalculator.calculate_from_velocity(
            velocity, rho, mu, chord_length, model
        )


class BoundaryLayerCalculator:
    """
    附面层厚度计算器
    """
    
    @staticmethod
    def bl_thickness(Re_x: float, x: float, turbulent: bool = True) -> float:
        """
        计算附面层厚度 δ
        
        层流: δ = 5.0 * x / sqrt(Re_x)
        湍流: δ = 0.37 * x / Re_x^(1/5)
        """
        if Re_x <= 0 or x <= 0:
            return 0
            
        if turbulent:
            return 0.37 * x / (Re_x ** 0.2)
        else:
            return 5.0 * x / math.sqrt(Re_x)
    
    @staticmethod
    def displacement_thickness(Re_x: float, x: float, turbulent: bool = True) -> float:
        """
        计算排移厚度 δ*
        """
        if turbulent:
            # 湍流近似
            return 0.046 * x / (Re_x ** 0.2)
        else:
            # 层流: δ* = 1.7208 * x / sqrt(Re_x)
            return 1.7208 * x / math.sqrt(Re_x)
    
    @staticmethod
    def momentum_thickness(Re_x: float, x: float, turbulent: bool = True) -> float:
        """
        计算动量损失厚度 θ
        """
        if turbulent:
            # 湍流近似
            return 0.036 * x / (Re_x ** 0.2)
        else:
            # 层流: θ = 0.664 * x / sqrt(Re_x)
            return 0.664 * x / math.sqrt(Re_x)
    
    @staticmethod
    def calculate(velocity: float, rho: float, mu: float, x: float) -> dict:
        """
        完整附面层计算
        """
        nu = mu / rho
        Re_x = rho * velocity * x / mu
        
        # 判断流态
        is_turbulent = Re_x > 5e5
        
        delta = BoundaryLayerCalculator.bl_thickness(Re_x, x, is_turbulent)
        delta_star = BoundaryLayerCalculator.displacement_thickness(Re_x, x, is_turbulent)
        theta = BoundaryLayerCalculator.momentum_thickness(Re_x, x, is_turbulent)
        
        # 形状因子 H = δ*/θ
        H = delta_star / theta if theta > 0 else 0
        
        return {
            "position_m": x,
            "velocity_m_s": velocity,
            "reynolds_number_Re_x": Re_x,
            "flow_type": "Turbulent" if is_turbulent else "Laminar",
            "boundary_layer_thickness_m": delta,
            "displacement_thickness_m": delta_star,
            "momentum_thickness_m": theta,
            "shape_factor_H": H,
        }


class DragCalculator:
    """
    阻力计算器
    """
    
    # 典型物体的阻力系数
    CD_VALUES = {
        "sphere": 0.47,
        "flat_plate": 0.002,  # 平板平行
        "cylinder": 0.99,
        "airfoil_0deg": 0.006,
        "airfoil_10deg": 0.08,
        " streamlined_body": 0.04,
        "car": 0.3,
        "truck": 0.7,
        "building": 1.2,
    }
    
    @staticmethod
    def pressure_drag(cd: float, q: float, area: float) -> float:
        """压差阻力 D = Cd * q * A"""
        return cd * q * area
    
    @staticmethod
    def friction_drag(cf: float, q: float, area: float) -> float:
        """摩阻 D = Cf * q * A (简化)"""
        return cf * q * area
    
    @staticmethod
    def form_factor(lambda_ratio: float) -> float:
        """
        形状因子 (Hoerner)
        λ = fineness ratio (长度/最大厚度)
        """
        if lambda_ratio <= 0:
            return 1.0
        return 1.0 / (lambda_ratio ** 0.7)
    
    @staticmethod
    def calculate(velocity: float, rho: float, area: float, 
                  body_type: str = "sphere") -> dict:
        """
        阻力计算
        """
        q = 0.5 * rho * velocity ** 2  # 动压
        
        # 获取Cd
        cd = DragCalculator.CD_VALUES.get(body_type, 0.47)
        
        # 计算阻力
        D = DragCalculator.pressure_drag(cd, q, area)
        
        return {
            "velocity_m_s": velocity,
            "dynamic_pressure_Pa": q,
            "area_m2": area,
            "body_type": body_type,
            "drag_coefficient_Cd": cd,
            "drag_force_N": D,
        }


class LiftCalculator:
    """
    升力计算器
    """
    
    @staticmethod
    def lift_coefficient(cl_alpha: float, alpha_deg: float) -> float:
        """
        线性升力系数 Cl = Cl_alpha * alpha (rad)
        默认 Cl_alpha ≈ 2π (薄翼理论)
        """
        alpha_rad = math.radians(alpha_deg)
        return cl_alpha * alpha_rad
    
    @staticmethod
    def lift(cl: float, q: float, area: float) -> float:
        """升力 L = Cl * q * A"""
        return cl * q * area
    
    @staticmethod
    def calculate(velocity: float, rho: float, area: float,
                 alpha_deg: float = 10, cl_alpha: float = 2 * math.pi) -> dict:
        """
        升力计算
        """
        q = 0.5 * rho * velocity ** 2
        
        cl = LiftCalculator.lift_coefficient(cl_alpha, alpha_deg)
        L = LiftCalculator.lift(cl, q, area)
        
        return {
            "velocity_m_s": velocity,
            "dynamic_pressure_Pa": q,
            "area_m2": area,
            "angle_of_attack_deg": alpha_deg,
            "lift_coefficient_Cl": cl,
            "lift_force_N": L,
        }


class PressureCoefficientCalculator:
    """
    压力系数计算器
    Cp = (P - P_inf) / q
    """
    
    @staticmethod
    def pressure_coefficient(p: float, p_inf: float, q: float) -> float:
        """压力系数 Cp"""
        if q <= 0:
            return 0
        return (p - p_inf) / q
    
    @staticmethod
    def stagnation_cp(mach: float) -> float:
        """滞止点压力系数 (完全滞止)"""
        if mach <= 0:
            return 1.0
        return 1.0 - 1.0 / ((1 + (GAMMA - 1) / 2 * mach ** 2) ** (GAMMA / (GAMMA - 1)))
    
    @staticmethod
    def calculate(mach: float, p: float = None, p_inf: float = None) -> dict:
        """
        压力系数计算
        """
        # 计算来流动压
        T = SEA_LEVEL_TEMPERATURE  # 使用海平面
        a = math.sqrt(GAMMA * R * T)
        V = mach * a
        q = 0.5 * SEA_LEVEL_PRESSURE / (R * T) * V ** 2
        
        # 默认使用来流压力
        if p_inf is None:
            p_inf = SEA_LEVEL_PRESSURE
        
        # 计算Cp
        if p is not None:
            cp = PressureCoefficientCalculator.pressure_coefficient(p, p_inf, q)
        else:
            cp = PressureCoefficientCalculator.stagnation_cp(mach)
        
        return {
            "mach_number": mach,
            "freestream_velocity_m_s": V,
            "dynamic_pressure_Pa": q,
            "freestream_pressure_Pa": p_inf,
            "pressure_coefficient_Cp": cp,
            "stagnation_Cp": PressureCoefficientCalculator.stagnation_cp(mach),
        }


class ReynoldsNumberCalculator:
    """
    雷诺数计算器
    """
    
    @staticmethod
    def reynolds(velocity: float, length: float, rho: float, mu: float) -> float:
        """Re = ρ * V * L / μ"""
        return rho * velocity * length / mu
    
    @staticmethod
    def critical_reynolds(surface: str = "flat_plate") -> float:
        """典型临界雷诺数"""
        critical = {
            "flat_plate": 5e5,
            "sphere": 2e5,
            "cylinder": 2e5,
            "airfoil": 3e6,
            "sphere_bluff": 2e5,
        }
        return critical.get(surface, 5e5)
    
    @staticmethod
    def calculate(velocity: float, length: float, rho: float, mu: float) -> dict:
        """完整雷诺数计算"""
        Re = ReynoldsNumberCalculator.reynolds(velocity, length, rho, mu)
        Re_crit = ReynoldsNumberCalculator.critical_reynolds()
        
        return {
            "velocity_m_s": velocity,
            "length_m": length,
            "density_kg_m3": rho,
            "viscosity_Pa_s": mu,
            "reynolds_number_Re": Re,
            "critical_reynolds": Re_crit,
            "is_turbulent": Re > Re_crit,
        }


# === 主程序 ===
def demo():
    """演示所有计算器"""
    
    print("=" * 70)
    print("          CFD 参数计算器集")
    print("=" * 70)
    
    # 示例条件：12km高度，M2.0
    altitude = 12000  # m
    mach = 2.0
    chord = 1.0  # 翼弦长 1m
    
    calc = AerodynamicsCalculator(altitude, mach)
    velocity = calc.V
    rho = calc.rho
    mu = calc.mu
    q = calc.q
    
    print(f"\n【输入条件】")
    print(f"  高度: {altitude/1000:.1f} km")
    print(f"  马赫数: {mach}")
    print(f"  速度: {velocity:.2f} m/s")
    print(f"  密度: {rho:.6f} kg/m³")
    print(f"  粘度: {mu:.2e} Pa·s")
    print(f"  动压: {q:.2f} Pa")
    
    # 1. y+ 计算
    print("\n" + "=" * 70)
    print("【1. y+ 计算器】")
    print("=" * 70)
    yplus_result = YPlusCalculator.calculate_from_mach(altitude, mach, chord)
    print(f"\n  雷诺数 Re_x: {yplus_result['reynolds_number']:.2e}")
    print(f"  摩阻系数 Cf: {yplus_result['friction_coefficient']:.6f}")
    print(f"  壁面剪切应力: {yplus_result['wall_shear_stress_Pa']:.4f} Pa")
    print(f"  摩擦速度 u*: {yplus_result['friction_velocity_m_s']:.4f} m/s")
    print(f"\n  第一层网格高度建议:")
    for model, height in yplus_result['first_layer_height'].items():
        print(f"    {model:30s}: {height*1e6:8.4f} μm")
    
    # 2. 附面层计算
    print("\n" + "=" * 70)
    print("【2. 附面层厚度计算器】")
    print("=" * 70)
    x_positions = [0.1, 0.5, 1.0, 2.0]  # 沿程位置
    for x in x_positions:
        bl = BoundaryLayerCalculator.calculate(velocity, rho, mu, x)
        print(f"\n  位置 x = {x}m:")
        print(f"    雷诺数 Re_x: {bl['reynolds_number_Re_x']:.2e}")
        print(f"    流态: {bl['flow_type']}")
        print(f"    附面层厚度 δ: {bl['boundary_layer_thickness_m']*1000:.4f} mm")
        print(f"    排移厚度 δ*: {bl['displacement_thickness_m']*1000:.4f} mm")
        print(f"    动量厚度 θ: {bl['momentum_thickness_m']*1000:.4f} mm")
        print(f"    形状因子 H: {bl['shape_factor_H']:.3f}")
    
    # 3. 阻力计算
    print("\n" + "=" * 70)
    print("【3. 阻力计算器】")
    print("=" * 70)
    area = 1.0  # 参考面积 1m²
    for body, cd in DragCalculator.CD_VALUES.items():
        D = DragCalculator.pressure_drag(cd, q, area)
        print(f"  {body:25s}: Cd = {cd:.3f}, D = {D:.2f} N")
    
    # 4. 升力计算
    print("\n" + "=" * 70)
    print("【4. 升力计算器】")
    print("=" * 70)
    for alpha in [0, 5, 10, 15, 20]:
        L_result = LiftCalculator.calculate(velocity, rho, area, alpha)
        print(f"  迎角 {alpha:2d}°: Cl = {L_result['lift_coefficient_Cl']:.4f}, 升力 = {L_result['lift_force_N']:.2f} N")
    
    # 5. 压力系数
    print("\n" + "=" * 70)
    print("【5. 压力系数计算器】")
    print("=" * 70)
    for m in [0.5, 1.0, 1.5, 2.0, 3.0]:
        cp_result = PressureCoefficientCalculator.calculate(m)
        print(f"  M = {m}: Cp_stagnation = {cp_result['stagnation_Cp']:.4f}")
    
    # 6. 雷诺数
    print("\n" + "=" * 70)
    print("【6. 雷诺数计算器】")
    print("=" * 70)
    lengths = [0.1, 0.5, 1.0, 5.0, 10.0]
    for L in lengths:
        re_result = ReynoldsNumberCalculator.calculate(velocity, L, rho, mu)
        print(f"  特征长度 {L:4.1f}m: Re = {re_result['reynolds_number_Re']:.2e}")
    
    print("\n" + "=" * 70)
    print("计算完成!")
    print("=" * 70)


if __name__ == "__main__":
    demo()
