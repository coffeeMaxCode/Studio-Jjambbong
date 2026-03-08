import os
import re
import time
import threading
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

# -----------------------------------------------------------------------------
# 로직 파트: 데이터 추출 및 병합
# -----------------------------------------------------------------------------
def extract_and_merge_matrix(root_folder_path, target_file_name, target_title, output_file_path):
    title_pattern = re.compile(r'^\[.*?\]\s*$')
    merged_data = []
    header_already_saved = False

    for root, dirs, files in os.walk(root_folder_path):
        if target_file_name in files:
            file_path = os.path.join(root, target_file_name)
            folder_name = os.path.basename(root)
            
            is_inside_target = False  
            has_matrix_started = False 
            header_row = "" 
            
            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f.readlines():
                    line = line.strip()

                    if title_pattern.match(line):
                        if line == target_title:
                            is_inside_target = True
                            has_matrix_started = False 
                            header_row = ""
                            continue
                        else:
                            if is_inside_target: break
                            continue

                    if is_inside_target:
                        if not line:
                            if has_matrix_started: break
                            else: continue 
                        
                        if re.match(r'^[0-9\.\s]+$', line):
                            has_matrix_started = True
                            merged_data.append(f"{folder_name} {line}")
                        else:
                            if has_matrix_started:
                                break 
                            else:
                                if not header_row:
                                    header_row = f"{line}"
                                continue
            
            if header_row and not header_already_saved:
                merged_data.insert(0, header_row)
                header_already_saved = True

    if merged_data:
        with open(output_file_path, 'w', encoding='utf-8') as out_f:
            for row in merged_data:
                out_f.write(row + '\n')
        return True, len(merged_data) - 1
    else:
        return False, 0

# -----------------------------------------------------------------------------
# 로직 파트: 시각화
# -----------------------------------------------------------------------------
def visualize_merged_data(file_path, x_col, y_col, point_size, marker_style):
    # 파일이 존재하는지 검사
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"병합된 결과 파일({file_path})을 찾을 수 없습니다. 먼저 추출 병합을 진행해주세요.")
        
    with open(file_path, 'r', encoding='utf-8') as f:
        original_headers = f.readline().strip().split()
        
    full_headers = ['Source'] + original_headers
    df = pd.read_csv(file_path, sep=r'\s+', skiprows=1, names=full_headers)
    
    # 선택된 헤더가 실제로 존재하는지 검사
    if x_col not in full_headers or y_col not in full_headers:
        raise ValueError(f"선택한 컬럼명({x_col} 또는 {y_col})이 데이터에 존재하지 않습니다.\n실제 컬럼명: {original_headers}")
    
    plt.figure(figsize=(10, 6))
    
    # marker_style 변환 (GUI 화면상의 글씨 -> 실제 시각화 라이브러리 코드)
    marker_dict = {
        '동그라미 (o)': 'o',
        '엑스 (x)': 'x',
        '네모 (s)': 's',
        '다이아몬드 (D)': 'D',
        '별 (*)': '*'
    }
    real_marker = marker_dict.get(marker_style, 'o')

    sns.scatterplot(
        data=df, 
        x=x_col, 
        y=y_col, 
        hue='Source',   
        style='Source',
        markers=[real_marker] * len(df['Source'].unique()), # 점 모양 적용 (모든 Source에 동일 모양 적용 시, 옵셔널하게 변경 가능)
        s=int(point_size) # 크기 적용
    )
    
    plt.legend(title='') # Legend에서 'Source' 타이틀 숨김
    plt.title(f'[{x_col}] vs [{y_col}]', fontsize=16) # 그래프 제목에서 'By Source' 숨김
    plt.xlabel(x_col, fontsize=12)
    plt.ylabel(y_col, fontsize=12)
    plt.grid(True, linestyle='--', alpha=0.7)
    
    plt.tight_layout()
    plt.show()


# -----------------------------------------------------------------------------
# GUI 화면 파트 (Tkinter)
# -----------------------------------------------------------------------------
class DataAnalyzerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Python 데이터 추출 & 시각화 자동화 툴 (GUI)")
        self.root.geometry("650x760") # 강제 종료 버튼 공간 확보를 위해 창 크기 넓힘
        self.root.resizable(False, False)

        # 전체 스타일 통일
        style = ttk.Style()
        style.configure('TLabelframe.Label', font=('Helvetica', 12, 'bold'))

        # ---------------------------------------
        # 1. 추출 및 병합 패널
        # ---------------------------------------
        frame1 = ttk.LabelFrame(self.root, text=" 1. 매트릭스 추출 및 파일 병합 설정 ", padding=15)
        frame1.pack(fill="x", padx=15, pady=10)

        # 1-1. 최상위 폴더 (Root Folder)
        tk.Label(frame1, text="탐색 최상위 폴더:").grid(row=0, column=0, sticky='w', pady=5)
        self.var_root_folder = tk.StringVar(value=".")
        ttk.Entry(frame1, textvariable=self.var_root_folder, width=40).grid(row=0, column=1, padx=5)
        ttk.Button(frame1, text="찾아보기", command=self.browse_folder).grid(row=0, column=2)

        # 1-2. 타깃 파일명
        tk.Label(frame1, text="탐색 대상 파일명:").grid(row=1, column=0, sticky='w', pady=5)
        self.var_target_file = tk.StringVar(value="data.txt")
        ttk.Entry(frame1, textvariable=self.var_target_file, width=40).grid(row=1, column=1, padx=5, sticky='w')

        # 1-3. 타깃 타이틀
        tk.Label(frame1, text="추출 타깃 [Title]:").grid(row=2, column=0, sticky='w', pady=5)
        self.var_target_title = tk.StringVar(value="[Title abc]")
        ttk.Entry(frame1, textvariable=self.var_target_title, width=40).grid(row=2, column=1, padx=5, sticky='w')

        # 1-4. 저장 결과 파일명
        tk.Label(frame1, text="결과 저장 파일명:").grid(row=3, column=0, sticky='w', pady=5)
        self.var_output_file = tk.StringVar(value="merged_output.txt")
        ttk.Entry(frame1, textvariable=self.var_output_file, width=40).grid(row=3, column=1, padx=5, sticky='w')

        # 1-5. [추출 및 병합 가동] 버튼
        btn_merge = tk.Button(frame1, text="📊 데이터 추출/병합 실행 시작", bg="#4CAF50", fg="white", font=('Helvetica', 10, 'bold'), command=self.run_extraction)
        btn_merge.grid(row=4, column=0, columnspan=3, pady=10, ipadx=10, ipady=5)

        # ---------------------------------------
        # 2. 시각화 (그래프) 패널
        # ---------------------------------------
        frame2 = ttk.LabelFrame(self.root, text=" 2. 데이터 시각화 (산점도) 설정 ", padding=15)
        frame2.pack(fill="x", padx=15, pady=10)

        # 2-0. 분석 대상 파일 선택 (NEW)
        tk.Label(frame2, text="시각화 대상 파일:").grid(row=0, column=0, sticky='w', pady=5)
        self.var_vis_file = tk.StringVar(value="merged_output.txt")
        ttk.Entry(frame2, textvariable=self.var_vis_file, width=40).grid(row=0, column=1, sticky='w', padx=5)
        ttk.Button(frame2, text="파일 찾기", command=self.browse_vis_file).grid(row=0, column=2, padx=5)

        # 2-1. X축 이름
        tk.Label(frame2, text="X축 컬럼명 (원본 이름표):").grid(row=1, column=0, sticky='w', pady=5)
        self.var_x_col = tk.StringVar(value="correlation")
        ttk.Entry(frame2, textvariable=self.var_x_col, width=20).grid(row=1, column=1, sticky='w', padx=5)

        # 2-2. Y축 이름
        tk.Label(frame2, text="Y축 컬럼명 (원본 이름표):").grid(row=2, column=0, sticky='w', pady=5)
        self.var_y_col = tk.StringVar(value="LWR")
        ttk.Entry(frame2, textvariable=self.var_y_col, width=20).grid(row=2, column=1, sticky='w', padx=5)

        # 2-3. 점 크기 슬라이더 
        tk.Label(frame2, text="점 크기 (Size 조절):").grid(row=3, column=0, sticky='w', pady=15)
        self.var_point_size = tk.DoubleVar(value=100)
        scale = tk.Scale(frame2, variable=self.var_point_size, from_=10, to=300, orient=tk.HORIZONTAL, length=200)
        scale.grid(row=3, column=1, sticky='w', padx=5)

        # 2-4. 점 모양 콤보박스 
        tk.Label(frame2, text="점 모양 (Marker 조절):").grid(row=4, column=0, sticky='w', pady=5)
        self.var_marker = tk.StringVar(value="동그라미 (o)")
        combobox = ttk.Combobox(frame2, textvariable=self.var_marker, values=["동그라미 (o)", "엑스 (x)", "네모 (s)", "다이아몬드 (D)", "별 (*)"], state="readonly")
        combobox.grid(row=4, column=1, sticky='w', padx=5)

        # 2-5. [통합 실행] 및 [단독 시각화 실행] 버튼
        # 붉은 테두리 프레임 (버튼 정렬)
        btn_frame = tk.Frame(frame2)
        btn_frame.grid(row=5, column=0, columnspan=3, pady=15)
        
        btn_vis_only = tk.Button(btn_frame, text="🎨 설정 변경 후 시각화만 재실행", bg="#2196F3", fg="white", font=('Helvetica', 10, 'bold'), command=self.run_visualization_only)
        btn_vis_only.pack(side="left", padx=10, ipadx=10, ipady=5)

        # ---------------------------------------
        # 3. 비상 정지 기능
        # ---------------------------------------
        btn_stop = tk.Button(self.root, text="🚨 무한 루프/오류 방지 강제 종료 (단축키: Esc)", bg="#F44336", fg="white", font=('Helvetica', 10, 'bold'), command=self.emergency_stop)
        btn_stop.pack(fill="x", padx=15, pady=5, ipady=8)

        # Esc 키 바인딩
        self.root.bind('<Escape>', self.emergency_stop)

    def emergency_stop(self, event=None):
        """오류나 무한 루프 발생 시 모든 작업을 즉각 중단하고 앱 끄기"""
        import os
        os._exit(0)

    def browse_folder(self):
        """탐색기 창을 열어 기준 폴더를 선택하게 도와주는 기능"""
        selected_folder = filedialog.askdirectory()
        if selected_folder:
            self.var_root_folder.set(selected_folder)

    def browse_vis_file(self):
        """탐색기 창을 열어 시각화 대상 텍스트 파일을 고르게 도와주는 기능"""
        selected_file = filedialog.askopenfilename(filetypes=[("Text Files", "*.txt"), ("CSV Files", "*.csv"), ("All Files", "*.*")])
        if selected_file:
            self.var_vis_file.set(selected_file)

    def run_extraction(self):
        """1단계 병합 버튼을 눌렀을 때 작동하는 함수 (UI 멈춤 방지를 위해 스레드 사용)"""
        root_folder = self.var_root_folder.get()
        target_file = self.var_target_file.get()
        target_title = self.var_target_title.get()
        output_file = self.var_output_file.get()

        if not root_folder or not target_file or not target_title or not output_file:
            messagebox.showwarning("입력 오류", "모든 입력칸(폴더, 파일명, 타이틀, 결과 파일명)을 채워주세요.")
            return

        # 백그라운드 스레드에서 추출을 진행하여 무한 루프 시에도 강제 종료(Esc)가 작동하도록 설계
        def extraction_task():
            try:
                start_time = time.time()
                is_success, row_count = extract_and_merge_matrix(root_folder, target_file, target_title, output_file)
                elapsed_time = round(time.time() - start_time, 2)

                if is_success:
                    self.root.after(0, self._on_extract_success, output_file, row_count, elapsed_time)
                else:
                    self.root.after(0, messagebox.showwarning, "데이터 없음", f"지정하신 경로({root_folder})에서 조건에 맞는 데이터를 찾지 못했습니다.\n타이틀 문법이나 파일 이름을 다시 확인해주세요.")
                    
            except Exception as e:
                self.root.after(0, messagebox.showerror, "시스템 오류", f"병합 작업 중 치명적인 에러가 발생했습니다:\n\n{e}")

        threading.Thread(target=extraction_task, daemon=True).start()

    def _on_extract_success(self, output_file, row_count, elapsed_time):
        self.var_vis_file.set(output_file)
        messagebox.showinfo("병합 완료", f"병합 성공! 👏\n총 {row_count}줄의 데이터가 추출되었습니다.\n소요 시간: {elapsed_time}초\n\n결과 파일: {output_file}\n(이제 아래의 시각화 버튼을 이용해 그래프를 그려보세요)")

    def run_visualization_only(self):
        """2단계 시각화만 독립적으로 재실행하는 버튼"""
        vis_file = self.var_vis_file.get()
        x_col = self.var_x_col.get()
        y_col = self.var_y_col.get()
        pt_size = self.var_point_size.get()
        marker = self.var_marker.get()

        if not x_col or not y_col:
            messagebox.showwarning("입력 오류", "X축과 Y축 컬럼 이름을 모두 입력해주세요.")
            return

        try:
            if not vis_file:
                messagebox.showwarning("입력 오류", "시각화 대상 파일 경로를 입력해주세요.")
                return

            # 팝업 알람 없이 조용히 그래프를 엽니다. (사용자는 그래프가 뜨는 걸로 성공 여부를 앎)
            visualize_merged_data(vis_file, x_col, y_col, pt_size, marker)
            
        except FileNotFoundError as e:
            messagebox.showerror("파일 없음", str(e))
        except ValueError as e:
            messagebox.showerror("입력값 오류", str(e))
        except Exception as e:
            messagebox.showerror("시각화 오류", f"그래프를 그리는 동안 방해물이 발견되었습니다:\n\n{e}")

# -----------------------------------------------------------------------------
# 진입점 (마법의 코드가 윈도우 창으로 변신하는 지점)
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    # 메인 창을 하나 띄우고, 안에 우리가 만든 GUI 설계도를 집어넣습니다.
    root_window = tk.Tk()
    app = DataAnalyzerGUI(root_window)
    # 프로그램 창이 종료될 때까지 무한대기(Loop) 시킵니다.
    root_window.mainloop()
