"""
生成常用大气参数表并保存为CSV
"""

import csv
from aerodynamics_calculator import AerodynamicsCalculator, EXAMPLE_CONDITIONS

# 生成常用高度-马赫数组合的数据表
def generate_csv_table(filename="atmosphere_data_table.csv"):
    """生成CSV格式的数据表"""
    
    # 定义要生成的数据点
    altitudes_km = [0, 1, 3, 5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 50]
    mach_numbers = [0.1, 0.3, 0.5, 0.7, 0.85, 0.95, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0]
    
    headers = [
        "高度_km", "马赫数", "静态温度_K", "静态温度_C", 
        "静态压力_Pa", "静态压力_kPa", "静态压力_atm",
        "密度_kg_m3", "声速_m_s", "飞行速度_m_s", "飞行速度_km_h",
        "总温_K", "总温_C", "总压_Pa", "总压_kPa", "总压_atm",
        "动压_Pa", "动压_kPa", "动力粘度_Pa_s", "运动粘度_m2_s", "雷诺数_m"
    ]
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        
        for alt_km in altitudes_km:
            for mach in mach_numbers:
                try:
                    calc = AerodynamicsCalculator(alt_km * 1000, mach)
                    r = calc.get_results()
                    
                    row = [
                        r['altitude_km'],
                        r['mach_number'],
                        round(r['static_temperature_K'], 4),
                        round(r['static_temperature_C'], 4),
                        round(r['static_pressure_Pa'], 4),
                        round(r['static_pressure_kPa'], 6),
                        round(r['static_pressure_atm'], 8),
                        round(r['density_kg_m3'], 8),
                        round(r['speed_of_sound_m_s'], 4),
                        round(r['velocity_m_s'], 4),
                        round(r['velocity_km_h'], 4),
                        round(r['total_temperature_K'], 4),
                        round(r['total_temperature_C'], 4),
                        round(r['total_pressure_Pa'], 4),
                        round(r['total_pressure_kPa'], 6),
                        round(r['total_pressure_atm'], 8),
                        round(r['dynamic_pressure_Pa'], 4),
                        round(r['dynamic_pressure_kPa'], 6),
                        round(r['dynamic_viscosity_Pa_s'], 10),
                        round(r['kinematic_viscosity_m2_s'], 12),
                        round(r['reynolds_number_per_m'], 2),
                    ]
                    writer.writerow(row)
                except Exception as e:
                    print(f"Error at alt={alt_km}km, mach={mach}: {e}")
    
    print(f"CSV数据表已保存到: {filename}")
    return filename

def generate_text_table(filename="atmosphere_data_table.txt"):
    """生成文本格式的数据表（更易读）"""
    
    altitudes_km = [0, 5, 10, 15, 20, 25, 30, 40, 50]
    mach_numbers = [0.5, 0.85, 1.0, 1.5, 2.0, 3.0, 5.0, 8.0, 10.0]
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("=" * 100 + "\n")
        f.write("空气动力学参数速查表 (NASA US Standard Atmosphere 1976)\n")
        f.write("=" * 100 + "\n\n")
        
        for alt_km in altitudes_km:
            f.write(f"\n{'─'*50}\n")
            f.write(f"高度: {alt_km} km\n")
            f.write(f"{'─'*50}\n")
            
            header = f"{'马赫':>6} {'T(K)':>8} {'P(kPa)':>10} {'ρ(kg/m³)':>12} {'a(m/s)':>8} {'V(m/s)':>10} {'T₀(K)':>8} {'P₀(kPa)':>10} {'动压(kPa)':>10}"
            f.write(header + "\n")
            f.write("-" * len(header) + "\n")
            
            for mach in mach_numbers:
                try:
                    calc = AerodynamicsCalculator(alt_km * 1000, mach)
                    r = calc.get_results()
                    
                    row = f"{r['mach_number']:>6.2f} {r['static_temperature_K']:>8.2f} {r['static_pressure_kPa']:>10.4f} {r['density_kg_m3']:>12.6f} {r['speed_of_sound_m_s']:>8.2f} {r['velocity_m_s']:>10.2f} {r['total_temperature_K']:>8.2f} {r['total_pressure_kPa']:>10.4f} {r['dynamic_pressure_kPa']:>10.4f}"
                    f.write(row + "\n")
                except:
                    pass
    
    print(f"文本数据表已保存到: {filename}")
    return filename

if __name__ == "__main__":
    csv_file = generate_csv_table()
    txt_file = generate_text_table()
    print("\n数据表生成完成!")
