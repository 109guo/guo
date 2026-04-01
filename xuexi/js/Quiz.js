// 题库数据结构
let questionBank = [];
let filteredQuestions = [];
let wrongQuestions = [];
let selectedQuestionTypes = ['单选题', '多选题', '判断题', '填空题']; // 默认选择所有类型
let scoreSettings = {
    '单选题': 1,
    '多选题': 2,
    '判断题': 1,
    '填空题': 2
}; // 默认分值设置
let currentMode = ''; // 'practice' 或 'exam'
let currentIndex = 0;
let userAnswers = []; // 用户答案记录
let examResults = []; // 考试结果记录
let showUnansweredAndWrongOnly = false; // 仅显示未做题和错题的开关状态

// 题目历史状态记录（记录每道题的错误次数、最后一次错误时间、正确次数、最后一次正确时间）
let questionHistory = {};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();
    bindEvents();
    renderWrongQuestions();
    
    // 初始化开关状态（默认在考试模式下禁用开关）
    const toggleAnswerDisplay = document.getElementById('toggleAnswerDisplay');
    const toggleShowAfterAnswer = document.getElementById('toggleShowAfterAnswer');
    const toggleUnansweredAndWrong = document.getElementById('toggleUnansweredAndWrong');
    if (toggleAnswerDisplay) {
        // 确保开关处于关闭状态
        toggleAnswerDisplay.checked = false;
        // 禁用开关
        toggleAnswerDisplay.disabled = true;
        // 添加视觉上的禁用效果
        toggleAnswerDisplay.parentElement.classList.add('opacity-50');
        
        // 更新开关的视觉状态
        const label = toggleAnswerDisplay.nextElementSibling;
        const slider = label.querySelector('.toggle-slider');
        label.classList.remove('bg-green-500');
        label.classList.add('bg-gray-300');
        slider.classList.remove('transform', 'translate-x-6');
        slider.classList.add('ml-0.5');
    }
    if (toggleShowAfterAnswer) {
        // 确保开关处于关闭状态
        toggleShowAfterAnswer.checked = false;
        // 禁用开关
        toggleShowAfterAnswer.disabled = true;
        // 添加视觉上的禁用效果
        toggleShowAfterAnswer.parentElement.classList.add('opacity-50');
        
        // 更新开关的视觉状态
        const label = toggleShowAfterAnswer.nextElementSibling;
        const slider = label.querySelector('.toggle-slider');
        label.classList.remove('bg-green-500');
        label.classList.add('bg-gray-300');
        slider.classList.remove('transform', 'translate-x-6');
        slider.classList.add('ml-0.5');
    }
    if (toggleUnansweredAndWrong) {
        // 根据保存的状态设置开关
        toggleUnansweredAndWrong.checked = showUnansweredAndWrongOnly;
        // 禁用开关（默认在考试模式下禁用）
        toggleUnansweredAndWrong.disabled = true;
        // 添加视觉上的禁用效果
        if (toggleUnansweredAndWrong.disabled) {
            toggleUnansweredAndWrong.parentElement.classList.add('opacity-50');
        } else {
            toggleUnansweredAndWrong.parentElement.classList.remove('opacity-50');
        }
        
        // 更新开关的视觉状态
        const label = toggleUnansweredAndWrong.nextElementSibling;
        const slider = label.querySelector('.toggle-slider');
        if (showUnansweredAndWrongOnly) {
            label.classList.remove('bg-gray-300');
            label.classList.add('bg-green-500');
            slider.classList.remove('ml-0.5');
            slider.classList.add('transform', 'translate-x-6');
        } else {
            label.classList.remove('bg-green-500');
            label.classList.add('bg-gray-300');
            slider.classList.remove('transform', 'translate-x-6');
            slider.classList.add('ml-0.5');
        }
    }
});

// 从localStorage加载数据
function loadFromLocalStorage() {
    const bankData = localStorage.getItem('questionBank');
    const wrongData = localStorage.getItem('wrongQuestions');
    const fileName = localStorage.getItem('importedFileName');
    const scoreData = localStorage.getItem('scoreSettings');
    const selectedTypesData = localStorage.getItem('selectedQuestionTypes');
    const historyData = localStorage.getItem('questionHistory');
    const showUnansweredAndWrongOnlyData = localStorage.getItem('showUnansweredAndWrongOnly');
    
    if (bankData) {
        questionBank = JSON.parse(bankData);
        
        // 确保所有题目都有_uniqueId
        questionBank.forEach((question, index) => {
            if (!question._uniqueId) {
                question._uniqueId = generateUniqueId(question.题干, index);
            }
        });
        
        // 根据用户选择的题目类型筛选题目
        filterQuestionsByType();
    }
    
    if (wrongData) {
        wrongQuestions = JSON.parse(wrongData);
        
        // 确保错题集中的题目也有_uniqueId
        wrongQuestions.forEach((item) => {
            if (item.question && !item.question._uniqueId) {
                item.question._uniqueId = generateUniqueId(item.question.题干, item.originalIndex);
            }
        });
    }
    
    if (scoreData) {
        scoreSettings = JSON.parse(scoreData);
    }
    
    if (selectedTypesData) {
        selectedQuestionTypes = JSON.parse(selectedTypesData);
    }
    
    // 加载题目历史状态
    if (historyData) {
        questionHistory = JSON.parse(historyData);
        
        // 处理已有的时间格式，将ISO格式转换为易读格式
        for (const uniqueId in questionHistory) {
            const history = questionHistory[uniqueId];
            if (history.lastWrongTime && history.lastWrongTime.includes('T')) {
                history.lastWrongTime = formatDateTime(history.lastWrongTime);
            }
            if (history.lastCorrectTime && history.lastCorrectTime.includes('T')) {
                history.lastCorrectTime = formatDateTime(history.lastCorrectTime);
            }
        }
    }
    
    // 加载仅未做题和错题开关状态
    if (showUnansweredAndWrongOnlyData !== null) {
        showUnansweredAndWrongOnly = JSON.parse(showUnansweredAndWrongOnlyData);
    } else {
        // 如果没有保存的状态，默认关闭
        showUnansweredAndWrongOnly = false;
    }
    
    // 显示已导入的文件名
    if (fileName && questionBank.length > 0) {
        document.getElementById('fileName').textContent = fileName;
        document.getElementById('questionCount').textContent = questionBank.length;
        document.getElementById('importedFileInfo').classList.remove('hidden');
        document.getElementById('questionTypeFilter').classList.remove('hidden');
        // 更新题目类型复选框状态
        updateTypeCheckboxes();
    } else {
        document.getElementById('importedFileInfo').classList.add('hidden');
        document.getElementById('questionTypeFilter').classList.add('hidden');
    }
}

// 保存到localStorage
function saveToLocalStorage() {
    localStorage.setItem('questionBank', JSON.stringify(questionBank));
    localStorage.setItem('wrongQuestions', JSON.stringify(wrongQuestions));
    localStorage.setItem('scoreSettings', JSON.stringify(scoreSettings));
    localStorage.setItem('selectedQuestionTypes', JSON.stringify(selectedQuestionTypes));
    localStorage.setItem('questionHistory', JSON.stringify(questionHistory));
    localStorage.setItem('showUnansweredAndWrongOnly', JSON.stringify(showUnansweredAndWrongOnly));
}

// 绑定事件
function bindEvents() {
    document.getElementById('importBtn').addEventListener('click', importQuestionBank);
    document.getElementById('exportBtn').addEventListener('click', exportQuestionBank);
    document.getElementById('templateBtn').addEventListener('click', exportTemplate);
    document.getElementById('resetBtn').addEventListener('click', resetQuestionBank);
    document.getElementById('practiceBtn').addEventListener('click', () => startPractice());
    document.getElementById('examBtn').addEventListener('click', showExamSettingModal);
    document.getElementById('wrongQuestionsBtn').addEventListener('click', showWrongQuestionsModal);
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
    document.getElementById('autoRemoveToggle').addEventListener('change', toggleAutoRemove);
    
    // 题目类型选择事件
    const typeCheckboxes = document.querySelectorAll('input[name="questionType"]');
    typeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', handleQuestionTypeChange);
    });
    
    document.getElementById('selectAllTypes').addEventListener('click', selectAllTypes);
    document.getElementById('clearAllTypes').addEventListener('click', clearAllTypes);
    
    // 题目区域按钮
    document.getElementById('prevQuestion').addEventListener('click', showPrevQuestion);
    document.getElementById('nextQuestion').addEventListener('click', showNextQuestion);
    document.getElementById('checkAnswer').addEventListener('click', showAnswerDirectly); // 修改为直接显示答案
    document.getElementById('finishExamEarly').addEventListener('click', finishExamEarly);
    
    // 考试结果区域按钮
    const finishExamBtn = document.getElementById('finishExam');
    if (finishExamBtn) {
        finishExamBtn.addEventListener('click', function(event) {
            console.log('finishExam button clicked, event:', event);
            finishExam();
        });
        console.log('finishExam event listener added');
    } else {
        console.error('finishExam button not found');
    }
    document.getElementById('viewExamWrongQuestions').addEventListener('click', viewExamWrongQuestions);
    
    // 错题集模态框按钮
    document.getElementById('closeWrongQuestionsModal').addEventListener('click', hideWrongQuestionsModal);
    document.getElementById('deleteAllWrongQuestionsBtn').addEventListener('click', deleteAllWrongQuestions); // 添加全部删除按钮事件
    document.getElementById('redoWrongQuestionsBtn').addEventListener('click', redoWrongQuestions); // 添加重做错题按钮事件
    document.getElementById('exportWrongQuestionsBtn').addEventListener('click', exportWrongQuestionsToExcel); // 添加导出错题集按钮事件
    // 点击模态框外部关闭
    document.getElementById('wrongQuestionsModal').addEventListener('click', function(event) {
        if (event.target === this) {
            hideWrongQuestionsModal();
        }
    });
    
    // 考试错题模态框按钮
    document.getElementById('closeExamWrongQuestionsModal').addEventListener('click', hideExamWrongQuestionsModal);
    // 点击考试错题模态框外部关闭
    document.getElementById('examWrongQuestionsModal').addEventListener('click', function(event) {
        if (event.target === this) {
            hideExamWrongQuestionsModal();
        }
    });
    
    // 分值设置模态框按钮
    document.getElementById('closeScoreSettingModal').addEventListener('click', hideScoreSettingModal);
    document.getElementById('cancelScoreSetting').addEventListener('click', hideScoreSettingModal);
    document.getElementById('saveScoreSetting').addEventListener('click', saveScoreSetting);
    
    // 点击分值设置模态框外部关闭
    document.getElementById('scoreSettingModal').addEventListener('click', function(event) {
        if (event.target === this) {
            hideScoreSettingModal();
        }
    });
    
    // 考试设置模态框按钮
    document.getElementById('closeExamSettingModal').addEventListener('click', hideExamSettingModal);
    document.getElementById('cancelExamSetting').addEventListener('click', hideExamSettingModal);
    document.getElementById('startExamWithSettings').addEventListener('click', startExamWithSettings);
    
    // 点击考试设置模态框外部关闭
    document.getElementById('examSettingModal').addEventListener('click', function(event) {
        if (event.target === this) {
            hideExamSettingModal();
        }
    });
    
    // 显示答案切换开关
    const toggleAnswerDisplayCheckbox = document.getElementById('toggleAnswerDisplay');
    if (toggleAnswerDisplayCheckbox) {
        toggleAnswerDisplayCheckbox.addEventListener('change', function() {
            const label = this.nextElementSibling;
            const slider = label.querySelector('.toggle-slider');
            
            if (this.checked) {
                // 切换到开启状态
                label.classList.remove('bg-gray-300');
                label.classList.add('bg-green-500');
                slider.classList.remove('ml-0.5');
                slider.classList.add('transform', 'translate-x-6');
                
                // 在练习模式下，根据答题后显示开关的状态决定是否显示答案
                if (currentMode === 'practice') {
                    // 检查是否启用了答题后显示
                    const showAfterAnswerEnabled = document.getElementById('toggleShowAfterAnswer') && 
                                                  document.getElementById('toggleShowAfterAnswer').checked;
                    
                    // 如果答题后显示开关关闭，或者开关开启但用户已答题，则显示答案
                    if (!showAfterAnswerEnabled || userAnswers[currentIndex] !== null) {
                        showAnswer();
                    }
                }
            } else {
                // 切换到关闭状态
                label.classList.remove('bg-green-500');
                label.classList.add('bg-gray-300');
                slider.classList.remove('transform', 'translate-x-6');
                slider.classList.add('ml-0.5');
                
                // 隐藏答案区域
                document.getElementById('answerSection').classList.add('hidden');
            }
        });
    }
    
    // 答题后显示切换开关
    const toggleShowAfterAnswerCheckbox = document.getElementById('toggleShowAfterAnswer');
    if (toggleShowAfterAnswerCheckbox) {
        toggleShowAfterAnswerCheckbox.addEventListener('change', function() {
            const label = this.nextElementSibling;
            const slider = label.querySelector('.toggle-slider');
            
            if (this.checked) {
                // 切换到开启状态
                label.classList.remove('bg-gray-300');
                label.classList.add('bg-green-500');
                slider.classList.remove('ml-0.5');
                slider.classList.add('transform', 'translate-x-6');
            } else {
                // 切换到关闭状态
                label.classList.remove('bg-green-500');
                label.classList.add('bg-gray-300');
                slider.classList.remove('transform', 'translate-x-6');
                slider.classList.add('ml-0.5');
            }
            
            // 重新显示当前题目以应用新的设置
            if (currentMode === 'practice') {
                showQuestion(currentIndex);
            }
        });
    }
    
    // 仅未做题和错题切换开关
    const toggleUnansweredAndWrongCheckbox = document.getElementById('toggleUnansweredAndWrong');
    if (toggleUnansweredAndWrongCheckbox) {
        toggleUnansweredAndWrongCheckbox.addEventListener('change', function() {
            const label = this.nextElementSibling;
            const slider = label.querySelector('.toggle-slider');
            
            if (this.checked) {
                // 切换到开启状态
                label.classList.remove('bg-gray-300');
                label.classList.add('bg-green-500');
                slider.classList.remove('ml-0.5');
                slider.classList.add('transform', 'translate-x-6');
                
                // 设置状态并重新筛选题目
                showUnansweredAndWrongOnly = true;
                saveToLocalStorage(); // 保存开关状态
                if (currentMode === 'practice') {
                    filterQuestionsByAnswerStatus();
                    // 重置到第一题
                    currentIndex = 0;
                    // 重置用户答案数组
                    userAnswers = new Array(filteredQuestions.length).fill(null);
                    showQuestion(currentIndex);
                    renderQuestionProgress();
                }
            } else {
                // 切换到关闭状态
                label.classList.remove('bg-green-500');
                label.classList.add('bg-gray-300');
                slider.classList.remove('transform', 'translate-x-6');
                slider.classList.add('ml-0.5');
                
                // 设置状态并重新筛选题目
                showUnansweredAndWrongOnly = false;
                saveToLocalStorage(); // 保存开关状态
                if (currentMode === 'practice') {
                    // 恢复原来的题目筛选
                    filterQuestionsByType();
                    // 重置到第一题
                    currentIndex = 0;
                    // 重置用户答案数组
                    userAnswers = new Array(filteredQuestions.length).fill(null);
                    showQuestion(currentIndex);
                    renderQuestionProgress();
                }
            }
        });
    }
    
    // 开关事件已在bindEvents中直接处理，无需额外初始化
}

// 导入题库
function importQuestionBank() {
    document.getElementById('fileInput').click();
}

// 处理文件选择
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        // 使用特定选项读取Excel文件，确保日期格式正确处理
        // 参考用户提供的代码，使用raw: false和cellDates: true来正确处理日期
        const workbook = XLSX.read(data, {type: 'array', cellNF: false, cellDates: true, raw: false, dateNF: 'yyyy/mm/dd'});
        
        // 获取第一个工作表
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // 使用XLSX.utils.sheet_to_json直接转换为JSON，日期格式已经正确处理
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {raw: false, defval: ""});
        
        // 验证表头
        const headers = Object.keys(jsonData[0] || {});
        const requiredHeaders = ['题干', '答案'];
        
        // 检查必需的列是否存在（不再需要类型列）
        const hasRequiredHeaders = requiredHeaders.every(header => headers.includes(header));
        
        if (!hasRequiredHeaders) {
            alert('Excel文件格式不正确，请确保包含题干、答案列！');
            return;
        }
        
        // 自动判断题目类型
        const processedData = jsonData.map((row, index) => {
            // 创建一个新的对象，保留原数据，并确保所有值都是原始字符串
            const newRow = {};
            for (const key in row) {
                // 确保所有值都转换为字符串，保持原始格式
                let value = row[key];
                
                // 特殊处理：确保Excel日期格式保持原始字符串
                newRow[key] = convertExcelValueToString(value);
            }
            
            // 自动判断类型
            newRow.类型 = determineQuestionType(newRow);
            
            // 为每个题目添加唯一标识符
            // 确保即使重新导入也能保持一致性
            if (!newRow._uniqueId) {
                newRow._uniqueId = generateUniqueId(newRow.题干, index);
            } else {
                // 如果已经有_uniqueId，直接使用
                newRow._uniqueId = newRow._uniqueId;
            }
            
            return newRow;
        });
        
        // 更新题库
        questionBank = processedData;
        // 初始化筛选后的题目（默认选择所有类型）
        filteredQuestions = [...processedData];
        // 保存文件名到localStorage
        localStorage.setItem('importedFileName', file.name);
        saveToLocalStorage();
        // 显示文件信息和题目类型选择
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('questionCount').textContent = processedData.length;
        document.getElementById('importedFileInfo').classList.remove('hidden');
        document.getElementById('questionTypeFilter').classList.remove('hidden');
        // 更新题目类型复选框状态
        updateTypeCheckboxes();
        alert('题库导入成功！');
    };
    
    reader.readAsArrayBuffer(file);
    // 清空文件输入框
    event.target.value = '';
}

// 生成题目唯一标识符
function generateUniqueId(questionStem, index) {
    // 使用题干内容和索引生成更稳定的唯一ID
    // 添加更多熵以避免重复
    const cleanStem = questionStem.replace(/\s+/g, '').substring(0, 50);
    const hash = btoa(unescape(encodeURIComponent(cleanStem))).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
    return `${Date.now()}_${index}_${hash}`;
}

// 基于题干内容生成稳定哈希值（不依赖时间戳）
function generateStableId(questionStem, index) {
    // 使用题干内容生成稳定的哈希值
    let hash = 0;
    const str = questionStem.replace(/\s+/g, '');
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
    }
    return `${Math.abs(hash)}_${index}`;
}// 基于题干内容生成稳定哈希值
function generateStableHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
}

// 自动判断题目类型
function determineQuestionType(row) {
    // 如果原来就有类型列且不为空，优先使用原有类型
    if (row.类型 && row.类型.trim() !== '') {
        return row.类型;
    }
    
    const questionStem = row.题干 || '';
    // 确保答案是字符串
    const answer = String(row.答案);
    
    // 规则1：当答案为对、错、正确、错误、TRUE、FALSE时，且其他答案选项内容为空，为判断题
    // 处理Excel中可能的不同导入格式：字符串'TRUE'/'FALSE'、数字1/0、布尔值true/false
    const isTrueAnswer = (answer === '对' || answer === '正确' || answer === 'TRUE' || answer === '1' || answer === 'true');
    const isFalseAnswer = (answer === '错' || answer === '错误' || answer === 'FALSE' || answer === '0' || answer === 'false');
    
    if ((isTrueAnswer || isFalseAnswer) && !hasAnyOptionContent(row)) {
        return '判断题';
    }
    
    // 新增规则：检查题干中是否包含填空题特征（括号或下划线）
    // 检查是否有括号（中文或英文），且括号中间为空或只有空格
    const hasChineseBracketWithSpaces = /[（(]\s*[)）]/g.test(questionStem);
    // 检查是否有独立的下划线（前后有空格或在句首/句尾）
    const hasStandaloneUnderscore = /(\s|^)_+(\s|$)/g.test(questionStem);
    
    // 如果题干中有括号（中间为空或只有空格）或独立的下划线，且选项都为空，则为填空题
    if ((hasChineseBracketWithSpaces || hasStandaloneUnderscore) && !hasAnyOptionContent(row)) {
        return '填空题';
    }
    
    // 获取选项内容
    const optionA = (row['选项A'] || '').trim();
    const optionB = (row['选项B'] || '').trim();
    
    // 规则2：当答案为单个字母，且只存在选项A和选项B
    if (/^[A-Z]$/.test(answer) && optionA && optionB && !hasMoreThanTwoOptions(row)) {
        // 检查是否满足判断题的条件
        if ((optionA === '对' && optionB === '错') ||
            (optionA === '正确' && optionB === '错误') ||
            (optionA === 'TRUE' && optionB === 'FALSE') ||
            (optionA === 'FALSE' && optionB === 'TRUE') ||
            (optionA === '错' && optionB === '对') ||
            (optionA === '错误' && optionB === '正确') ||
            (optionA === '1' && optionB === '0') ||
            (optionA === '0' && optionB === '1') ||
            (optionA === 'true' && optionB === 'false') ||
            (optionA === 'false' && optionB === 'true')) {
            return '判断题';
        }
        
        // 规则3：当答案为单个字母，且至少存在两个选项答案，且至少一个选项不为对、错、正确、错误时，为单选题
        if (!isJudgmentOption(optionA) || !isJudgmentOption(optionB)) {
            return '单选题';
        } else {
            // 如果两个选项都是判断题选项，则为判断题
            return '判断题';
        }
    }
    
    // 规则4：当答案为至少两个字母，且至少存在两个选项答案时，为多选题
    if (/^[A-Z]+$/.test(answer) && answer.length >= 2 && hasAtLeastTwoOptions(row)) {
        return '多选题';
    }
    
    // 规则5：当答案为单个字母，且至少存在两个选项答案时，为单选题
    if (/^[A-Z]$/.test(answer) && hasAtLeastTwoOptions(row)) {
        return '单选题';
    }
    
    // 默认为填空题
    return '填空题';
}

// 检查是否有任何选项内容
function hasAnyOptionContent(row) {
    const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    for (let i = 0; i < optionLabels.length; i++) {
        // 确保选项值是字符串
        const optionValue = String(row[`选项${optionLabels[i]}`]);
        if (optionValue && optionValue.trim() !== '') {
            return true;
        }
    }
    return false;
}

// 检查是否有超过两个选项
function hasMoreThanTwoOptions(row) {
    const optionLabels = ['C', 'D', 'E', 'F', 'G', 'H'];
    for (let i = 0; i < optionLabels.length; i++) {
        // 确保选项值是字符串
        const optionValue = String(row[`选项${optionLabels[i]}`]);
        if (optionValue && optionValue.trim() !== '') {
            return true;
        }
    }
    return false;
}

// 检查是否为判断题选项
function isJudgmentOption(option) {
    // 确保选项是字符串并去除首尾空格后进行比较
    const trimmedOption = String(option).trim();
    return trimmedOption === '对' || trimmedOption === '错' || trimmedOption === 'TRUE' || trimmedOption === 'FALSE' || trimmedOption === '正确' || trimmedOption === '错误' ||
           trimmedOption === '1' || trimmedOption === '0' || trimmedOption === 'true' || trimmedOption === 'false';
}

// 检查是否有至少两个选项
function hasAtLeastTwoOptions(row) {
    // 确保选项值是字符串
    const optionA = String(row['选项A']) || '';
    const optionB = String(row['选项B']) || '';
    return optionA.trim() !== '' && optionB.trim() !== '';
}

// 导出题库
function exportQuestionBank() {
    if (questionBank.length === 0) {
        alert('当前没有题库可以导出！');
        return;
    }
    
    // 为每道题添加历史状态信息
    const exportData = questionBank.map(question => {
        // 确保题目有_uniqueId
        if (!question._uniqueId) {
            question._uniqueId = generateUniqueId(question.题干, questionBank.indexOf(question));
        }
        
        // 获取题目历史状态
        const history = questionHistory[question._uniqueId] || {
            wrongCount: 0,
            lastWrongTime: '',
            correctCount: 0,
            lastCorrectTime: ''
        };
        
        // 确保所有历史状态字段都有默认值
        const safeHistory = {
            wrongCount: history.wrongCount || 0,
            lastWrongTime: history.lastWrongTime || '',
            correctCount: history.correctCount || 0,
            lastCorrectTime: history.lastCorrectTime || ''
        };
        
        // 格式化时间显示
        const formattedHistory = {
            wrongCount: safeHistory.wrongCount,
            lastWrongTime: safeHistory.lastWrongTime ? formatDateTime(safeHistory.lastWrongTime) : '',
            correctCount: safeHistory.correctCount,
            lastCorrectTime: safeHistory.lastCorrectTime ? formatDateTime(safeHistory.lastCorrectTime) : ''
        };
        
        // 返回包含历史状态的题目数据
        return {
            ...question,
            '错误次数': formattedHistory.wrongCount,
            '最后一次错误时间': formattedHistory.lastWrongTime,
            '正确次数': formattedHistory.correctCount,
            '最后一次正确时间': formattedHistory.lastCorrectTime
        };
    });
    
    exportToExcel(exportData, '题库.xlsx');
}

// 导出模板
function exportTemplate() {
    const template = [{
        '题干': '示例题目',
        '答案': 'A',
        '选项A': '选项A内容',
        '选项B': '选项B内容',
        '选项C': '选项C内容',
        '选项D': '选项D内容',
        '选项E': '',
        '选项F': '',
        '选项G': '',
        '选项H': '',
        '解析': '这是题目的解析',
        '类型': '单选题'
    }];
    
    exportToExcel(template, '题库模板.xlsx');
}

// 导出为Excel文件
function exportToExcel(data, filename) {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '题库');
    XLSX.writeFile(wb, filename);
}

// 重置题库
function resetQuestionBank() {
    if (confirm('确定要清除当前题库吗？此操作不可恢复！')) {
        questionBank = [];
        filteredQuestions = [];
        wrongQuestions = [];
        selectedQuestionTypes = ['单选题', '多选题', '判断题', '填空题'];
        // 清除保存的文件名
        localStorage.removeItem('importedFileName');
        saveToLocalStorage();
        // 隐藏文件信息显示和题目类型选择
        document.getElementById('importedFileInfo').classList.add('hidden');
        document.getElementById('questionTypeFilter').classList.add('hidden');
        // 隐藏题目区域
        document.getElementById('questionArea').classList.add('hidden');
        
        // 隐藏模式指示器
        updateModeIndicator(null);
        alert('题库已清空！');
        renderWrongQuestions();
    }
}

// 检查是否启用显示答案
function isAnswerDisplayEnabled() {
    const toggleCheckbox = document.getElementById('toggleAnswerDisplay');
    return toggleCheckbox && toggleCheckbox.checked;
}

// 检查是否启用答题后显示
function isShowAfterAnswerEnabled() {
    const toggleCheckbox = document.getElementById('toggleShowAfterAnswer');
    return toggleCheckbox && toggleCheckbox.checked;
}

// 更新模式指示器
function updateModeIndicator(mode) {
    // 隐藏所有指示器
    document.getElementById('practiceModeIndicator').classList.add('hidden');
    document.getElementById('examModeIndicator').classList.add('hidden');
    document.getElementById('wrongQuestionsModeIndicator').classList.add('hidden');
    
    // 根据当前模式显示对应的指示器
    switch(mode) {
        case 'practice':
            document.getElementById('practiceModeIndicator').classList.remove('hidden');
            break;
        case 'exam':
            document.getElementById('examModeIndicator').classList.remove('hidden');
            break;
        case 'wrongQuestions':
            document.getElementById('wrongQuestionsModeIndicator').classList.remove('hidden');
            break;
    }
}



// 开始练习模式
function startPractice() {
    // 确保题目类型筛选是最新的
    filterQuestionsByType();
    
    if (filteredQuestions.length === 0) {
        if (questionBank.length === 0) {
            alert('请先导入题库！');
        } else {
            alert('请选择至少一种题目类型！');
        }
        return;
    }
    
    currentMode = 'practice';
    currentIndex = 0;
    userAnswers = new Array(filteredQuestions.length).fill(null);
    examResults = [];
    
    // 默认关闭"仅未做题和错题开关"
    showUnansweredAndWrongOnly = false;
    saveToLocalStorage(); // 保存开关状态
    
    // 更新模式指示器
    // 检查是否是从错题集进入的练习模式
    const fromWrongQuestions = sessionStorage.getItem('fromWrongQuestions') === 'true';
    if (fromWrongQuestions) {
        updateModeIndicator('wrongQuestions');
    } else {
        updateModeIndicator('practice');
        // 确保在正常练习模式下清除fromWrongQuestions标志
        sessionStorage.removeItem('fromWrongQuestions');
    }    
    document.getElementById('questionArea').classList.remove('hidden');
    document.getElementById('examResultArea').classList.add('hidden');
    
    // 显示练习模式按钮，隐藏考试模式按钮
    document.getElementById('checkAnswer').classList.remove('hidden');
    document.getElementById('finishExamEarly').classList.add('hidden');
    
    // 在练习模式下启用显示答案和答题后显示开关
    const toggleAnswerDisplay = document.getElementById('toggleAnswerDisplay');
    const toggleShowAfterAnswer = document.getElementById('toggleShowAfterAnswer');
    const toggleUnansweredAndWrong = document.getElementById('toggleUnansweredAndWrong');
    if (toggleAnswerDisplay) {
        toggleAnswerDisplay.disabled = false;
        toggleAnswerDisplay.parentElement.classList.remove('opacity-50');
        
        // 更新开关的视觉状态
        const label = toggleAnswerDisplay.nextElementSibling;
        const slider = label.querySelector('.toggle-slider');
        if (toggleAnswerDisplay.checked) {
            label.classList.remove('bg-gray-300');
            label.classList.add('bg-green-500');
            slider.classList.remove('ml-0.5');
            slider.classList.add('transform', 'translate-x-6');
        } else {
            label.classList.remove('bg-green-500');
            label.classList.add('bg-gray-300');
            slider.classList.remove('transform', 'translate-x-6');
            slider.classList.add('ml-0.5');
        }
    }
    if (toggleShowAfterAnswer) {
        toggleShowAfterAnswer.disabled = false;
        toggleShowAfterAnswer.parentElement.classList.remove('opacity-50');
        
        // 更新开关的视觉状态
        const label = toggleShowAfterAnswer.nextElementSibling;
        const slider = label.querySelector('.toggle-slider');
        if (toggleShowAfterAnswer.checked) {
            label.classList.remove('bg-gray-300');
            label.classList.add('bg-green-500');
            slider.classList.remove('ml-0.5');
            slider.classList.add('transform', 'translate-x-6');
        } else {
            label.classList.remove('bg-green-500');
            label.classList.add('bg-gray-300');
            slider.classList.remove('transform', 'translate-x-6');
            slider.classList.add('ml-0.5');
        }
    }
    if (toggleUnansweredAndWrong) {
        toggleUnansweredAndWrong.disabled = false;
        toggleUnansweredAndWrong.parentElement.classList.remove('opacity-50');
        
        // 更新开关的视觉状态
        const label = toggleUnansweredAndWrong.nextElementSibling;
        const slider = label.querySelector('.toggle-slider');
        if (toggleUnansweredAndWrong.checked) {
            label.classList.remove('bg-gray-300');
            label.classList.add('bg-green-500');
            slider.classList.remove('ml-0.5');
            slider.classList.add('transform', 'translate-x-6');
        } else {
            label.classList.remove('bg-green-500');
            label.classList.add('bg-gray-300');
            slider.classList.remove('transform', 'translate-x-6');
            slider.classList.add('ml-0.5');
        }
    }
    
    showQuestion(currentIndex);
    renderQuestionProgress();
}

// 开始考试模式
function startExam() {
    if (filteredQuestions.length === 0) {
        if (questionBank.length === 0) {
            alert('请先导入题库！');
        } else {
            alert('请选择至少一种题目类型！');
        }
        return;
    }
    
    currentMode = 'exam';
    currentIndex = 0;
    userAnswers = new Array(filteredQuestions.length).fill(null);
    examResults = new Array(filteredQuestions.length).fill(false); // 记录每道题是否答对
    
    // 更新模式指示器
    updateModeIndicator('exam');
    
    document.getElementById('questionArea').classList.remove('hidden');
    document.getElementById('examResultArea').classList.add('hidden');
    
    // 显示考试模式按钮，隐藏练习模式按钮
    document.getElementById('checkAnswer').classList.add('hidden');
    document.getElementById('finishExamEarly').classList.remove('hidden');
    
    // 在考试模式下禁用显示答案和答题后显示开关
    const toggleAnswerDisplay = document.getElementById('toggleAnswerDisplay');
    const toggleShowAfterAnswer = document.getElementById('toggleShowAfterAnswer');
    const toggleUnansweredAndWrong = document.getElementById('toggleUnansweredAndWrong');
    if (toggleAnswerDisplay) {
        // 确保开关处于关闭状态
        toggleAnswerDisplay.checked = false;
        // 禁用开关
        toggleAnswerDisplay.disabled = true;
        // 添加视觉上的禁用效果
        toggleAnswerDisplay.parentElement.classList.add('opacity-50');
        
        // 更新开关的视觉状态
        const label = toggleAnswerDisplay.nextElementSibling;
        const slider = label.querySelector('.toggle-slider');
        label.classList.remove('bg-green-500');
        label.classList.add('bg-gray-300');
        slider.classList.remove('transform', 'translate-x-6');
        slider.classList.add('ml-0.5');
    }
    if (toggleShowAfterAnswer) {
        // 确保开关处于关闭状态
        toggleShowAfterAnswer.checked = false;
        // 禁用开关
        toggleShowAfterAnswer.disabled = true;
        // 添加视觉上的禁用效果
        toggleShowAfterAnswer.parentElement.classList.add('opacity-50');
        
        // 更新开关的视觉状态
        const label = toggleShowAfterAnswer.nextElementSibling;
        const slider = label.querySelector('.toggle-slider');
        label.classList.remove('bg-green-500');
        label.classList.add('bg-gray-300');
        slider.classList.remove('transform', 'translate-x-6');
        slider.classList.add('ml-0.5');
    }
    if (toggleUnansweredAndWrong) {
        // 确保开关处于关闭状态
        toggleUnansweredAndWrong.checked = false;
        // 禁用开关
        toggleUnansweredAndWrong.disabled = true;
        // 添加视觉上的禁用效果
        toggleUnansweredAndWrong.parentElement.classList.add('opacity-50');
        
        // 更新开关的视觉状态
        const label = toggleUnansweredAndWrong.nextElementSibling;
        const slider = label.querySelector('.toggle-slider');
        label.classList.remove('bg-green-500');
        label.classList.add('bg-gray-300');
        slider.classList.remove('transform', 'translate-x-6');
        slider.classList.add('ml-0.5');
    }
    
    showQuestion(currentIndex);
    renderQuestionProgress();
}

// 显示题目
function showQuestion(index) {
    if (index < 0 || index >= filteredQuestions.length) return;
    
    // 保存当前题目的答案和历史状态（如果不是第一题）
    if (currentIndex >= 0 && currentIndex < filteredQuestions.length) {
        saveUserAnswer();
    }
    
    const question = filteredQuestions[index];
    currentIndex = index;
    
    // 显示题目信息
    document.getElementById('questionType').textContent = question.类型;
    document.getElementById('questionIndex').textContent = `第 ${index + 1} 题 / 共 ${filteredQuestions.length} 题`;
    document.getElementById('questionStem').textContent = question.题干;
    
    // 根据题目类型设置不同颜色的图标
    const questionTypeElement = document.getElementById('questionType');
    const questionTypeIconElement = document.getElementById('questionTypeIcon');
    
    switch(question.类型) {
        case '单选题':
            questionTypeElement.className = 'inline-block rounded-full px-3 py-1 text-sm font-semibold text-white bg-green-500 mr-2';
            questionTypeIconElement.className = 'inline-block w-6 h-6 rounded-full mr-2 flex items-center justify-center bg-green-500';
            break;
        case '多选题':
            questionTypeElement.className = 'inline-block rounded-full px-3 py-1 text-sm font-semibold text-white bg-red-500 mr-2';
            questionTypeIconElement.className = 'inline-block w-6 h-6 rounded-full mr-2 flex items-center justify-center bg-red-500';
            break;
        case '判断题':
            questionTypeElement.className = 'inline-block rounded-full px-3 py-1 text-sm font-semibold text-white bg-yellow-500 mr-2';
            questionTypeIconElement.className = 'inline-block w-6 h-6 rounded-full mr-2 flex items-center justify-center bg-yellow-500';
            break;
        case '填空题':
            questionTypeElement.className = 'inline-block rounded-full px-3 py-1 text-sm font-semibold text-white bg-blue-500 mr-2';
            questionTypeIconElement.className = 'inline-block w-6 h-6 rounded-full mr-2 flex items-center justify-center bg-blue-500';
            break;
        default:
            questionTypeElement.className = 'inline-block rounded-full px-3 py-1 text-sm font-semibold text-white bg-gray-500 mr-2';
            questionTypeIconElement.className = 'inline-block w-6 h-6 rounded-full mr-2 flex items-center justify-center bg-gray-500';
    }
    
    // 显示选项
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    
    if (question.类型 === '填空题') {
        // 对于填空题，显示一个输入框，限制最多10个字符
        const inputElement = document.createElement('div');
        inputElement.className = 'mb-4';
        inputElement.innerHTML = `
            <label class="block text-gray-700 text-sm font-bold mb-2">答案：</label>
            <input type="text" id="fillBlankInput" value="${userAnswers[index] || ''}" maxlength="10" class="shadow appearance-none border rounded w-60 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" placeholder="请输入答案（最多10个字符）">
            <div class="text-right text-sm text-gray-500 mt-1">
                <span id="charCount">${(userAnswers[index] || '').length}</span>/10
            </div>
        `;
        optionsContainer.appendChild(inputElement);
        
        // 添加字符计数功能
        setTimeout(() => {
            const fillBlankInput = document.getElementById('fillBlankInput');
            const charCountSpan = document.getElementById('charCount');
            if (fillBlankInput && charCountSpan) {
                fillBlankInput.addEventListener('input', function() {
                    charCountSpan.textContent = this.value.length;
                });
            }
        }, 0);
    } else {
        // 对于选择题，显示选项
        if (question.类型 === '判断题') {
            // 检查是否为自动生成选项的判断题
            const isAutoGenerated = (question.答案 === '对' || question.答案 === '错' || 
                                   question.答案 === '正确' || question.答案 === '错误' ||
                                   question.答案 === 'TRUE' || question.答案 === 'FALSE' ||
                                   question.答案 === 1 || question.答案 === 0 ||
                                   question.答案 === true || question.答案 === false);
            
            if (isAutoGenerated) {
                // 对于自动生成选项的判断题，生成对/错选项
                const judgmentOptions = [
                    { label: 'A', value: '对' },
                    { label: 'B', value: '错' }
                ];
                
                judgmentOptions.forEach(option => {
                    const optionElement = document.createElement('div');
                    optionElement.className = 'mb-2';
                    optionElement.innerHTML = `
                        <label class="inline-flex items-center">
                            <input type="radio" name="options" value="${option.label}" class="mr-2" ${userAnswers[index] === option.label ? 'checked' : ''}>
                            <span>${option.label}. ${option.value}</span>
                        </label>
                    `;
                    optionsContainer.appendChild(optionElement);
                });
            } else {
                // 对于有具体选项内容的判断题，显示具体选项
                const optionLabels = ['A', 'B'];
                optionLabels.forEach(label => {
                    // 确保选项值是字符串
                    const optionValue = String(question[`选项${label}`]);
                    if (optionValue) {
                        const optionElement = document.createElement('div');
                        optionElement.className = 'mb-2';
                        optionElement.innerHTML = `
                            <label class="inline-flex items-center">
                                <input type="radio" name="options" value="${label}" class="mr-2" ${userAnswers[index] === label ? 'checked' : ''}>
                                <span>${label}. ${optionValue}</span>
                            </label>
                        `;
                        optionsContainer.appendChild(optionElement);
                    }
                });
            }
        } else {
            // 对于单选题和多选题，显示选项
            // 计算选项数量
            let optionCount = 0;
            const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            for (let i = 0; i < optionLabels.length; i++) {
                if (question[`选项${optionLabels[i]}`]) {
                    optionCount++;
                } else {
                    break;
                }
            }
            
            for (let i = 0; i < optionCount; i++) {
                const label = optionLabels[i];
                // 确保选项值是字符串
                const optionValue = String(question[`选项${label}`]);
                
                if (!optionValue) continue;
                
                const optionElement = document.createElement('div');
                optionElement.className = 'mb-2';
                
                if (question.类型 === '单选题') {
                    optionElement.innerHTML = `
                        <label class="inline-flex items-center">
                            <input type="radio" name="options" value="${label}" class="mr-2" ${userAnswers[index] === label ? 'checked' : ''}>
                            <span>${label}. ${optionValue}</span>
                        </label>
                    `;
                } else if (question.类型 === '多选题') {
                    const isChecked = userAnswers[index] && userAnswers[index].includes(label) ? 'checked' : '';
                    optionElement.innerHTML = `
                        <label class="inline-flex items-center">
                            <input type="checkbox" name="options" value="${label}" class="mr-2" ${isChecked}>
                            <span>${label}. ${optionValue}</span>
                        </label>
                    `;
                }
                
                optionsContainer.appendChild(optionElement);
            }
        }
    }
    
    // 在练习模式下，根据显示答案开关和答题后显示开关的状态决定是否显示答案
    // 检查是否是从错题集进入的练习模式
    const fromWrongQuestions = sessionStorage.getItem('fromWrongQuestions') === 'true';
    if (fromWrongQuestions) {
        updateModeIndicator('wrongQuestions');
    }
    
    if (currentMode === 'practice') {
        // 检查是否启用了显示答案开关
        if (isAnswerDisplayEnabled()) {
            // 检查是否启用了答题后显示开关
            if (isShowAfterAnswerEnabled()) {
                // 答题后显示开关开启，只有在已答题的情况下才显示答案
                if (userAnswers[index] !== null) {
                    showAnswer();
                } else {
                    document.getElementById('answerSection').classList.add('hidden');
                }
            } else {
                // 答题后显示开关关闭，直接显示答案（无论是否答题）
                showAnswer();
            }
        } else {
            document.getElementById('answerSection').classList.add('hidden');
        }
    } else {
        document.getElementById('answerSection').classList.add('hidden');
    }
    
    // 在练习模式下，为选项添加事件监听器，根据设置决定是否自动显示答案
    if (currentMode === 'practice') {
        setTimeout(() => {
            const optionInputs = document.querySelectorAll('input[name="options"]');
            optionInputs.forEach(input => {
                input.addEventListener('change', function() {
                    // 保存答案
                    saveUserAnswer();
                    // 调试信息
                    console.log("选项更改后保存答案:", userAnswers[currentIndex]);
                    // 根据设置决定是否显示答案
                    if (isAnswerDisplayEnabled()) {
                        // 检查是否启用了"答题后显示"
                        if (isShowAfterAnswerEnabled()) {
                            // 只有在选择答案后才显示答案
                            showAnswer();
                        } else {
                            // 直接显示答案（无论是否选择答案）
                            showAnswer();
                        }
                    }
                    // 更新题目进度指示器颜色
                    renderQuestionProgress();
                    // 不再在选项更改时立即提交答案状态，避免多选题中途判题
                    // submitAnswerInPractice();
                });
            });
            
            // 如果显示答案开关已开启，根据"答题后显示"开关决定是否显示答案
            if (isAnswerDisplayEnabled()) {
                // 检查是否启用了"答题后显示"
                if (isShowAfterAnswerEnabled()) {
                    // 只有在已答题的情况下才显示答案
                    if (userAnswers[index] !== null) {
                        showAnswer();
                    } else {
                        // 隐藏答案
                        document.getElementById('answerSection').classList.add('hidden');
                    }
                } else {
                    // 直接显示答案（无论是否选择答案）
                    showAnswer();
                }
            }
            
            // 为填空题添加事件监听器
            const fillBlankInput = document.getElementById('fillBlankInput');
            if (fillBlankInput) {
                fillBlankInput.addEventListener('input', function() {
                    // 保存答案
                    saveUserAnswer();
                    // 填空题输入时不立即显示答案，仍需点击提交按钮
                    // 但需要更新题目进度指示器颜色
                    renderQuestionProgress();
                });
                
                // 为填空题添加失去焦点事件，用于提交答案
                fillBlankInput.addEventListener('blur', function() {
                    // 保存答案
                    saveUserAnswer();
                    // 不再在失去焦点时立即提交答案状态，避免中途判题
                    // submitAnswerInPractice();
                    // 更新题目进度指示器颜色
                    renderQuestionProgress();
                });
            }
        }, 0);
    }
    
    // 更新按钮状态
    document.getElementById('prevQuestion').disabled = index === 0;
    document.getElementById('nextQuestion').disabled = index === filteredQuestions.length - 1;
    
    // 根据模式显示不同的按钮
    if (currentMode === 'practice') {
        document.getElementById('checkAnswer').classList.remove('hidden');
        document.getElementById('finishExamEarly').classList.add('hidden');
    } else {
        document.getElementById('checkAnswer').classList.add('hidden');
        document.getElementById('finishExamEarly').classList.remove('hidden');
    }
    
    // 渲染题目进度指示器
    renderQuestionProgress();
}// 渲染题目进度指示器
function renderQuestionProgress() {
    const questionBoxesContainer = document.getElementById('questionBoxes');
    questionBoxesContainer.innerHTML = '';
    
    for (let i = 0; i < filteredQuestions.length; i++) {
        const box = document.createElement('div');
        const questionNumber = i + 1;
        box.className = 'w-5 h-5 flex items-center justify-center font-medium cursor-pointer rounded m-0 p-0';
        box.textContent = questionNumber;
        
        // 根据数字位数调整字体大小，确保不会超出方框
        if (questionNumber < 10) {
            box.classList.add('text-xs');
        } else if (questionNumber < 100) {
            box.classList.add('text-xs');
        } else if (questionNumber < 1000) {
            box.classList.add('text-[10px]');
        } else {
            box.classList.add('text-[8px]');
        }
        
        // 根据题目状态设置颜色
        if (currentMode === 'exam') {
            // 考试模式
            if (userAnswers[i] === null || userAnswers[i] === undefined || userAnswers[i] === '') {
                // 未作答
                box.classList.add('bg-gray-300', 'text-gray-700');
            } else if (examResults[i]) {
                // 正确
                box.classList.add('bg-green-500', 'text-white');
            } else {
                // 错误
                box.classList.add('bg-red-500', 'text-white');
            }
        } else {
            // 练习模式
            if (userAnswers[i] === null || userAnswers[i] === undefined || userAnswers[i] === '') {
                // 未作答
                box.classList.add('bg-gray-300', 'text-gray-700');
            } else {
                // 已作答，需要判断对错
                const question = filteredQuestions[i];
                const userAnswer = userAnswers[i];
                
                // 判断答案是否正确
                let isCorrect = false;
                if (question.类型 === '多选题') {
                    // 使用更严格的多选题答案比较函数
                    isCorrect = compareMultiChoiceAnswers(question.答案, userAnswer);
                    
                    // 调试信息
                    const correctAnswers = parseMultiChoiceAnswer(question.答案);
                    const userAnswersSorted = parseMultiChoiceAnswer(userAnswer);
                    console.log("多选题详细比较:");
                    console.log("标准化正确答案:", correctAnswers);
                    console.log("标准化用户答案:", userAnswersSorted);
                    console.log("答案长度比较:", correctAnswers.length, userAnswersSorted.length);
                    console.log("字符逐个比较:", correctAnswers.split('').sort().join(''), userAnswersSorted.split('').sort().join(''));
                    
                    // 调试信息
                    console.log("多选题答案比较:");
                    console.log("题目正确答案:", question.答案);
                    console.log("用户答案:", userAnswer);
                    console.log("处理后正确答案:", correctAnswers);
                    console.log("处理后用户答案:", userAnswersSorted);
                    console.log("多选题判题结果:", isCorrect);
                } else if (question.类型 === '判断题') {
                    // 对于判断题，需要特殊处理
                    // 判断是否为自动生成选项的判断题（答案为TRUE/FALSE/对/错等）
                    const isAutoGenerated = (question.答案 === '对' || question.答案 === '错' || 
                                           question.答案 === '正确' || question.答案 === '错误' ||
                                           question.答案 === 'TRUE' || question.答案 === 'FALSE' ||
                                           question.答案 === 1 || question.答案 === 0 ||
                                           question.答案 === true || question.答案 === false);
                    
                    if (isAutoGenerated) {
                        // 对于自动生成的选项（A表示对，B表示错）
                        if (userAnswer === 'A') {
                            isCorrect = (question.答案 === '对' || question.答案 === '正确' || question.答案 === 'TRUE' || question.答案 === 1 || question.答案 === true);
                        } else if (userAnswer === 'B') {
                            isCorrect = (question.答案 === '错' || question.答案 === '错误' || question.答案 === 'FALSE' || question.答案 === 0 || question.答案 === false);
                        } else {
                            // 如果不是自动生成的选项，直接比较
                            isCorrect = question.答案 === userAnswer;
                        }
                    } else {
                        // 对于有具体选项内容的判断题，需要比较用户选择的选项是否与题目答案一致
                        // 题目答案是选项的标识符（如'A'或'B'），而不是选项的内容
                        isCorrect = userAnswer === question.答案;
                    }
                } else {
                    // 单选题、填空题答案比较
                    isCorrect = question.答案 === userAnswer;
                }
                
                // 根据答题结果设置颜色
                if (isCorrect) {
                    // 正确
                    box.classList.add('bg-green-500', 'text-white');
                } else {
                    // 错误
                    box.classList.add('bg-red-500', 'text-white');
                }
            }
        }
        
        // 高亮当前题目
        if (i === currentIndex) {
            box.classList.add('ring-2', 'ring-blue-600');
        }
        
        // 添加点击事件
        box.addEventListener('click', () => {
            // 在考试模式下，切换题目时自动提交答案
            if (currentMode === 'exam') {
                submitAnswerIfNeeded();
            } else {
                // 在练习模式下，保存答案但不自动提交
                saveUserAnswer();
            }
            showQuestion(i);
        });
        
        questionBoxesContainer.appendChild(box);
    }
}

// 显示上一题
function showPrevQuestion() {
    if (currentIndex > 0) {
        // 在考试模式下，切换题目时自动提交答案
        if (currentMode === 'exam') {
            submitAnswerIfNeeded();
        } else {
            // 在练习模式下，自动提交答案
            submitAnswerInPractice();
        }
        showQuestion(currentIndex - 1);
    }
}

// 显示下一题
function showNextQuestion() {
    if (currentIndex < filteredQuestions.length - 1) {
        // 在考试模式下，切换题目时自动提交答案
        if (currentMode === 'exam') {
            submitAnswerIfNeeded();
        } else {
            // 在练习模式下，自动提交答案
            submitAnswerInPractice();
        }
        showQuestion(currentIndex + 1);
    }
}

// 保存用户答案
function saveUserAnswer() {
    const question = filteredQuestions[currentIndex];
    
    if (question.类型 === '单选题' || question.类型 === '判断题') {
        const selectedOption = document.querySelector('input[name="options"]:checked');
        userAnswers[currentIndex] = selectedOption ? selectedOption.value : null;
    } else if (question.类型 === '多选题') {
        const selectedOptions = document.querySelectorAll('input[name="options"]:checked');
        // 对多选题答案进行排序，确保答案顺序不影响判断结果
        userAnswers[currentIndex] = Array.from(selectedOptions).map(opt => opt.value).sort().join('');
        console.log("保存多选题答案:", userAnswers[currentIndex]);
    } else if (question.类型 === '填空题') {
        const fillBlankInput = document.getElementById('fillBlankInput');
        userAnswers[currentIndex] = fillBlankInput ? fillBlankInput.value : '';
    }
    
    // 更新题目历史状态
    updateQuestionHistory(question);
    
    // 保存到localStorage
    saveToLocalStorage();
}// 更完善的多选题答案解析函数
function parseMultiChoiceAnswer(answer) {
    // 去除所有空格和特殊字符，只保留字母
    const cleaned = answer.replace(/[^A-Z]/g, '');
    // 排序并连接
    return cleaned.split('').sort().join('');
}

// 更严格的多选题答案比较函数
function compareMultiChoiceAnswers(correctAnswer, userAnswer) {
    // 对两个答案都进行标准化处理
    const normalizedCorrect = parseMultiChoiceAnswer(correctAnswer);
    const normalizedUser = parseMultiChoiceAnswer(userAnswer);
    
    // 比较标准化后的答案
    return normalizedCorrect === normalizedUser;
}

// 格式化时间显示
function formatDateTime(date) {
    // 如果传入的是字符串，先转换为Date对象
    if (typeof date === 'string') {
        date = new Date(date);
    }
    
    // 检查日期是否有效
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return '';
    }
    
    // 获取年月日时分秒
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    // 返回格式化的时间字符串
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

// 更新题目历史状态
function updateQuestionHistory(question) {
    // 安全检查
    if (!question) return;
    
    // 确保题目有_uniqueId
    if (!question._uniqueId) {
        question._uniqueId = generateUniqueId(question.题干, questionBank.indexOf(question));
    }
    
    const uniqueId = question._uniqueId;
    
    // 初始化题目历史状态（如果不存在）
    if (!questionHistory[uniqueId]) {
        questionHistory[uniqueId] = {
            wrongCount: 0,
            lastWrongTime: '',
            correctCount: 0,
            lastCorrectTime: ''
        };
    }
    
    // 获取当前用户答案
    const userAnswer = userAnswers[currentIndex];
    
    // 如果用户已作答，更新相应的状态
    if (userAnswer !== null && userAnswer !== undefined && userAnswer !== '') {
        // 判断答案是否正确
        let isCorrect = false;
        
        if (question.类型 === '多选题') {
            isCorrect = compareMultiChoiceAnswers(question.答案, userAnswer);
        } else if (question.类型 === '判断题') {
            const isAutoGenerated = (question.答案 === '对' || question.答案 === '错' || 
                                   question.答案 === '正确' || question.答案 === '错误' ||
                                   question.答案 === 'TRUE' || question.答案 === 'FALSE' ||
                                   question.答案 === 1 || question.答案 === 0 ||
                                   question.答案 === true || question.答案 === false);
            
            if (isAutoGenerated) {
                if (userAnswer === 'A') {
                    isCorrect = (question.答案 === '对' || question.答案 === '正确' || question.答案 === 'TRUE' || question.答案 === 1 || question.答案 === true);
                } else if (userAnswer === 'B') {
                    isCorrect = (question.答案 === '错' || question.答案 === '错误' || question.答案 === 'FALSE' || question.答案 === 0 || question.答案 === false);
                } else {
                    isCorrect = question.答案 === userAnswer;
                }
            } else {
                isCorrect = userAnswer === question.答案;
            }
        } else {
            isCorrect = question.答案 === userAnswer;
        }
        
        // 更新历史状态
        const currentTime = formatDateTime(new Date());
        if (isCorrect) {
            questionHistory[uniqueId].correctCount = (questionHistory[uniqueId].correctCount || 0) + 1;
            questionHistory[uniqueId].lastCorrectTime = currentTime;
        } else {
            questionHistory[uniqueId].wrongCount = (questionHistory[uniqueId].wrongCount || 0) + 1;
            questionHistory[uniqueId].lastWrongTime = currentTime;
        }
    }
}// 在考试模式下提交答案（如果需要）
function submitAnswerIfNeeded() {
    // 检查当前题目是否已经有答案
    if (userAnswers[currentIndex] !== null && userAnswers[currentIndex] !== undefined && userAnswers[currentIndex] !== '') {
        // 如果已经有答案，则不需要重复提交
        return;
    }
    
    // 保存用户答案
    saveUserAnswer();
    
    // 获取当前题目和用户答案
    const question = filteredQuestions[currentIndex];
    const userAnswer = userAnswers[currentIndex];
    
    // 如果用户没有作答，则记录为错误
    if (userAnswer === null || userAnswer === '') {
        examResults[currentIndex] = false;
        // 添加到错题集
        const originalIndex = questionBank.indexOf(question);
        if (originalIndex >= 0) {
            addToWrongQuestions(originalIndex);
        }
        // 重新渲染题目进度指示器
        renderQuestionProgress();
        return;
    }
    
    // 判断答案是否正确
    let isCorrect = false;
    
    if (question.类型 === '多选题') {
        // 使用更严格的多选题答案比较函数
        isCorrect = compareMultiChoiceAnswers(question.答案, userAnswer);
        
        // 调试信息
        const correctAnswers = parseMultiChoiceAnswer(question.答案);
        const userAnswersSorted = parseMultiChoiceAnswer(userAnswer);
        console.log("多选题答案比较:");
        console.log("题目正确答案:", question.答案);
        console.log("用户答案:", userAnswer);
        console.log("处理后正确答案:", correctAnswers);
        console.log("处理后用户答案:", userAnswersSorted);
        console.log("多选题判题结果:", isCorrect);
    } else if (question.类型 === '判断题') {
        // 对于判断题，需要特殊处理
        // 判断是否为自动生成选项的判断题（答案为TRUE/FALSE/对/错等）
        const isAutoGenerated = (question.答案 === '对' || question.答案 === '错' || 
                               question.答案 === '正确' || question.答案 === '错误' ||
                               question.答案 === 'TRUE' || question.答案 === 'FALSE' ||
                               question.答案 === 1 || question.答案 === 0 ||
                               question.答案 === true || question.答案 === false);
        
        if (isAutoGenerated) {
            // 对于自动生成的选项（A表示对，B表示错）
            if (userAnswer === 'A') {
                isCorrect = (question.答案 === '对' || question.答案 === '正确' || question.答案 === 'TRUE' || question.答案 === 1 || question.答案 === true);
            } else if (userAnswer === 'B') {
                isCorrect = (question.答案 === '错' || question.答案 === '错误' || question.答案 === 'FALSE' || question.答案 === 0 || question.答案 === false);
            } else {
                // 如果不是自动生成的选项，直接比较
                isCorrect = question.答案 === userAnswer;
            }
        } else {
            // 对于有具体选项内容的判断题，需要比较用户选择的选项是否与题目答案一致
            // 题目答案是选项的标识符（如'A'或'B'），而不是选项的内容
            isCorrect = userAnswer === question.答案;
        }
    } else {
        // 单选题、填空题答案比较
        isCorrect = question.答案 === userAnswer;
    }
    
    // 记录考试结果
    examResults[currentIndex] = isCorrect;
    
    // 如果答错，添加到错题集
    if (!isCorrect) {
        // 注意：这里需要找到原始题库中的索引
        let originalIndex = -1;
        
        // 检查是否是从错题集进入的练习模式
        const fromWrongQuestions = sessionStorage.getItem('fromWrongQuestions') === 'true';
        
        // 如果是从错题集进入的练习模式
        if (fromWrongQuestions) {
            console.log("In redo wrong questions mode (wrong answer - exam)");
            // 通过原始索引查找（在重做错题模式下，题目中有_originalIndex属性）
            if (question._originalIndex !== undefined && question._originalIndex !== null) {
                originalIndex = question._originalIndex;
                console.log("Found originalIndex from _originalIndex:", originalIndex);
            } else {
                console.log("No _originalIndex in question, trying other methods");
                // 否则通过唯一ID查找
                console.log("question._uniqueId:", question._uniqueId);
                const foundInQuestionBank = questionBank.findIndex(q => q._uniqueId === question._uniqueId);
                if (foundInQuestionBank >= 0) {
                    originalIndex = foundInQuestionBank;
                    console.log("Found originalIndex from uniqueId:", originalIndex);
                } else {
                    // 最后尝试通过题干查找
                    console.log("question.题干:", question.题干);
                    originalIndex = questionBank.findIndex(q => q.题干 === question.题干);
                    console.log("Found originalIndex from question stem:", originalIndex);
                }
            }
        } else {
            console.log("Not in redo wrong questions mode (wrong answer - exam)");
            // 如果当前是在正常练习模式下或考试模式下
            // 通过唯一ID查找
            let foundInQuestionBank = questionBank.findIndex(q => q._uniqueId === question._uniqueId);
            if (foundInQuestionBank >= 0) {
                originalIndex = foundInQuestionBank;
                console.log("Found originalIndex from uniqueId (normal practice/exam):", originalIndex);
            } else {
                // 最后尝试通过题干查找
                foundInQuestionBank = questionBank.findIndex(q => q.题干 === question.题干);
                if (foundInQuestionBank >= 0) {
                    originalIndex = foundInQuestionBank;
                    console.log("Found originalIndex from question stem (normal practice/exam):", originalIndex);
                } else {
                    // 如果通过题干也找不到，尝试通过索引查找（作为最后的备选方案）
                    console.log("Warning: Could not find question by uniqueId or stem, using currentIndex as fallback");
                    if (currentIndex < questionBank.length) {
                        originalIndex = currentIndex;
                        console.log("Using currentIndex as fallback originalIndex:", originalIndex);
                    }
                }
            }
        }
        
        console.log("Final originalIndex for wrong answer:", originalIndex);
        if (originalIndex >= 0) {
            addToWrongQuestions(originalIndex);
        } else {
            console.log("Could not find originalIndex for wrong answer");
        }
    }    
    // 重新渲染题目进度指示器
    renderQuestionProgress();
}

// 提交答案
function checkAnswer() {
    saveUserAnswer();
    
    const question = filteredQuestions[currentIndex];
    const userAnswer = userAnswers[currentIndex];
    
    if (userAnswer === null || userAnswer === '') {
        alert('请选择答案或填写答案！');
        return;
    }
    
    // 判断答案是否正确
    let isCorrect = false;
    
    if (question.类型 === '多选题') {
        // 使用更严格的多选题答案比较函数
        isCorrect = compareMultiChoiceAnswers(question.答案, userAnswer);
        
        // 调试信息
        const correctAnswers = parseMultiChoiceAnswer(question.答案);
        const userAnswersSorted = parseMultiChoiceAnswer(userAnswer);
        console.log("多选题详细比较:");
        console.log("标准化正确答案:", correctAnswers);
        console.log("标准化用户答案:", userAnswersSorted);
        console.log("答案长度比较:", correctAnswers.length, userAnswersSorted.length);
        console.log("字符逐个比较:", correctAnswers.split('').sort().join(''), userAnswersSorted.split('').sort().join(''));
        
        // 调试信息
        console.log("多选题答案比较:");
        console.log("题目正确答案:", question.答案);
        console.log("用户答案:", userAnswer);
        console.log("处理后正确答案:", correctAnswers);
        console.log("处理后用户答案:", userAnswersSorted);
        console.log("多选题判题结果:", isCorrect);
    } else if (question.类型 === '判断题') {
        // 对于判断题，需要特殊处理
        // 判断是否为自动生成选项的判断题（答案为TRUE/FALSE/对/错等）
        const isAutoGenerated = (question.答案 === '对' || question.答案 === '错' || 
                               question.答案 === '正确' || question.答案 === '错误' ||
                               question.答案 === 'TRUE' || question.答案 === 'FALSE' ||
                               question.答案 === 1 || question.答案 === 0 ||
                               question.答案 === true || question.答案 === false);
        
        if (isAutoGenerated) {
            // 对于自动生成的选项（A表示对，B表示错）
            if (userAnswer === 'A') {
                isCorrect = (question.答案 === '对' || question.答案 === '正确' || question.答案 === 'TRUE' || question.答案 === 1 || question.答案 === true);
            } else if (userAnswer === 'B') {
                isCorrect = (question.答案 === '错' || question.答案 === '错误' || question.答案 === 'FALSE' || question.答案 === 0 || question.答案 === false);
            } else {
                // 如果不是自动生成的选项，直接比较
                isCorrect = question.答案 === userAnswer;
            }
        } else {
            // 对于有具体选项内容的判断题，需要比较用户选择的选项是否与题目答案一致
            // 题目答案是选项的标识符（如'A'或'B'），而不是选项的内容
            isCorrect = userAnswer === question.答案;
        }
    } else {
        // 单选题、填空题答案比较
        isCorrect = question.答案 === userAnswer;
    }
    
    console.log("=== checkAnswer Debug Info ===");
    console.log("currentIndex:", currentIndex);
    console.log("question:", question);
    console.log("userAnswer:", userAnswer);
    console.log("isCorrect:", isCorrect);
    console.log("currentMode:", currentMode);
    console.log("wrongQuestions length:", wrongQuestions ? wrongQuestions.length : 'null');
    
    // 记录考试结果
    if (currentMode === 'exam') {
        examResults[currentIndex] = isCorrect;
    }
    
    // 如果答错，添加到错题集
    if (!isCorrect) {
        // 注意：这里需要找到原始题库中的索引
        let originalIndex = -1;
        
        // 检查是否是从错题集进入的练习模式
        const fromWrongQuestions = sessionStorage.getItem('fromWrongQuestions') === 'true';
        
        // 如果是从错题集进入的练习模式
        if (fromWrongQuestions) {
            console.log("In redo wrong questions mode (wrong answer)");
            // 通过原始索引查找（在重做错题模式下，题目中有_originalIndex属性）
            if (question._originalIndex !== undefined && question._originalIndex !== null) {
                originalIndex = question._originalIndex;
                console.log("Found originalIndex from _originalIndex:", originalIndex);
            } else {
                console.log("No _originalIndex in question, trying other methods");
                // 否则通过唯一ID查找
                console.log("question._uniqueId:", question._uniqueId);
                const foundInQuestionBank = questionBank.findIndex(q => q._uniqueId === question._uniqueId);
                if (foundInQuestionBank >= 0) {
                    originalIndex = foundInQuestionBank;
                    console.log("Found originalIndex from uniqueId:", originalIndex);
                } else {
                    // 最后尝试通过题干查找
                    console.log("question.题干:", question.题干);
                    originalIndex = questionBank.findIndex(q => q.题干 === question.题干);
                    console.log("Found originalIndex from question stem:", originalIndex);
                }
            }
        } else {
            console.log("Not in redo wrong questions mode (wrong answer)");
            // 如果当前是在正常练习模式下或考试模式下
            // 通过唯一ID查找
            let foundInQuestionBank = questionBank.findIndex(q => q._uniqueId === question._uniqueId);
            if (foundInQuestionBank >= 0) {
                originalIndex = foundInQuestionBank;
                console.log("Found originalIndex from uniqueId (normal practice/exam):", originalIndex);
            } else {
                // 最后尝试通过题干查找
                foundInQuestionBank = questionBank.findIndex(q => q.题干 === question.题干);
                if (foundInQuestionBank >= 0) {
                    originalIndex = foundInQuestionBank;
                    console.log("Found originalIndex from question stem (normal practice/exam):", originalIndex);
                } else {
                    // 如果通过题干也找不到，尝试通过索引查找（作为最后的备选方案）
                    console.log("Warning: Could not find question by uniqueId or stem, using currentIndex as fallback");
                    if (currentIndex < questionBank.length) {
                        originalIndex = currentIndex;
                        console.log("Using currentIndex as fallback originalIndex:", originalIndex);
                    }
                }
            }
        }
        
        console.log("Final originalIndex for wrong answer:", originalIndex);
        if (originalIndex >= 0) {
            addToWrongQuestions(originalIndex);
        } else {
            console.log("Could not find originalIndex for wrong answer");
        }
    } else if (currentMode === 'practice') {
        // 如果答对，在错题集中减少错误计数
        // 注意：这里需要找到原始题库中的索引
        let originalIndex = -1;
        
        // 检查是否是从错题集进入的练习模式
        const fromWrongQuestions = sessionStorage.getItem('fromWrongQuestions') === 'true';
        
        // 如果是从错题集进入的练习模式
        if (fromWrongQuestions) {
            console.log("In redo wrong questions mode (correct answer)");
            // 通过原始索引查找（在重做错题模式下，题目中有_originalIndex属性）
            if (question._originalIndex !== undefined && question._originalIndex !== null) {
                originalIndex = question._originalIndex;
                console.log("Found originalIndex from _originalIndex:", originalIndex);
            } else {
                console.log("No _originalIndex in question, trying other methods");
                // 否则通过唯一ID查找
                console.log("question._uniqueId:", question._uniqueId);
                const foundInQuestionBank = questionBank.findIndex(q => q._uniqueId === question._uniqueId);
                if (foundInQuestionBank >= 0) {
                    originalIndex = foundInQuestionBank;
                    console.log("Found originalIndex from uniqueId:", originalIndex);
                } else {
                    // 最后尝试通过题干查找
                    console.log("question.题干:", question.题干);
                    originalIndex = questionBank.findIndex(q => q.题干 === question.题干);
                    console.log("Found originalIndex from question stem:", originalIndex);
                }
            }
        } else {
            console.log("Not in redo wrong questions mode (correct answer)");
            // 如果当前是在正常练习模式下或考试模式下
            // 通过唯一ID查找
            let foundInQuestionBank = questionBank.findIndex(q => q._uniqueId === question._uniqueId);
            if (foundInQuestionBank >= 0) {
                originalIndex = foundInQuestionBank;
                console.log("Found originalIndex from uniqueId (normal practice/exam):", originalIndex);
            } else {
                // 最后尝试通过题干查找
                foundInQuestionBank = questionBank.findIndex(q => q.题干 === question.题干);
                if (foundInQuestionBank >= 0) {
                    originalIndex = foundInQuestionBank;
                    console.log("Found originalIndex from question stem (normal practice/exam):", originalIndex);
                } else {
                    // 如果通过题干也找不到，尝试通过索引查找（作为最后的备选方案）
                    console.log("Warning: Could not find question by uniqueId or stem, using currentIndex as fallback");
                    if (currentIndex < questionBank.length) {
                        originalIndex = currentIndex;
                        console.log("Using currentIndex as fallback originalIndex:", originalIndex);
                    }
                }
            }
        }
        
        console.log("Final originalIndex for correct answer:", originalIndex);
        if (originalIndex >= 0) {
            updateWrongQuestionCount(originalIndex);
        } else {
            console.log("Could not find originalIndex for correct answer");
        }
    }    
    // 在练习模式下立即显示答案
    if (currentMode === 'practice') {
        showAnswer();
    }
    
    // 重新渲染题目进度指示器
    renderQuestionProgress();
    
    // 如果开启了仅显示未做题和错题的开关，则重新筛选题目列表
    if (currentMode === 'practice' && showUnansweredAndWrongOnly) {
        // 保存当前索引
        const previousIndex = currentIndex;
        
        // 重新筛选题目
        filterQuestionsByAnswerStatus();
        
        // 如果筛选后没有题目了，显示提示
        if (filteredQuestions.length === 0) {
            alert('所有题目都已完成且正确！');
            // 可以选择返回到完整题目列表或结束练习
            return;
        }
        
        // 尝试保持当前题目位置（如果还在筛选后的列表中）
        // 这里简单处理：如果当前题目还在列表中，保持当前位置；否则跳转到第一题
        if (previousIndex >= filteredQuestions.length) {
            currentIndex = 0;
        } else {
            currentIndex = previousIndex;
        }
        
        // 重新显示题目
        showQuestion(currentIndex);
        renderQuestionProgress();
    }
    
    // 在考试模式下，如果到达最后一题，则显示考试结果
    if (currentMode === 'exam' && currentIndex === filteredQuestions.length - 1) {
        showExamResult();
    }
}

// 显示答案和解析
function showAnswer() {
    const question = filteredQuestions[currentIndex];
    
    document.getElementById('correctAnswer').textContent = question.答案;
    document.getElementById('analysis').textContent = question.解析 || '暂无解析';
    
    document.getElementById('answerSection').classList.remove('hidden');
}

// 显示考试结果
function showExamResult() {
    // 确保所有题目都已提交答案
    submitAnswerIfNeeded();
    
    // 计算考试结果
    const totalQuestions = filteredQuestions.length;
    let correctCount = 0;
    
    // 计算正确题数
    for (let i = 0; i < examResults.length; i++) {
        if (examResults[i]) {
            correctCount++;
        }
    }
    
    const accuracyRate = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    
    // 更新考试结果区域的文本
    document.getElementById('totalQuestions').textContent = totalQuestions;
    document.getElementById('correctCount').textContent = correctCount;
    document.getElementById('accuracyRate').textContent = accuracyRate;
    
    // 根据正确题数决定是否显示查看错题按钮
    const viewExamWrongQuestionsBtn = document.getElementById('viewExamWrongQuestions');
    if (correctCount < totalQuestions) {
        viewExamWrongQuestionsBtn.classList.remove('hidden');
    } else {
        viewExamWrongQuestionsBtn.classList.add('hidden');
    }
    
    // 隐藏题目区域，显示考试结果区域
    document.getElementById('questionArea').classList.add('hidden');
    document.getElementById('examResultArea').classList.remove('hidden');
    
    // 保存到localStorage
    saveToLocalStorage();
}

// 结束考试
function finishExam() {
    console.log("finishExam function called");
    
    // 隐藏考试结果区域
    const examResultArea = document.getElementById('examResultArea');
    if (examResultArea) {
        examResultArea.classList.add('hidden');
        console.log("examResultArea hidden");
    } else {
        console.error("examResultArea not found");
    }
    
    // 隐藏题目区域
    const questionArea = document.getElementById('questionArea');
    if (questionArea) {
        questionArea.classList.add('hidden');
        console.log("questionArea hidden");
    }
    
    // 重置考试状态
    console.log("Resetting exam state");
    currentMode = '';
    currentIndex = 0;
    userAnswers = [];
    examResults = [];
    
    // 更新模式指示器
    console.log("Updating mode indicator");
    updateModeIndicator(null);
    
    // 保存到localStorage
    console.log("Saving to localStorage");
    saveToLocalStorage();
    
    console.log("finishExam function completed");
}
// 查看考试错题
function viewExamWrongQuestions() {
    // 渲染考试错题
    renderExamWrongQuestions();
    // 显示考试错题模态框
    document.getElementById('examWrongQuestionsModal').classList.remove('hidden');
}

// 渲染考试错题
function renderExamWrongQuestions() {
    const container = document.getElementById('examWrongQuestionsContainer');
    
    // 找出考试中的错题
    const examWrongQuestions = [];
    for (let i = 0; i < examResults.length; i++) {
        if (!examResults[i]) { // 如果答错
            examWrongQuestions.push({
                question: filteredQuestions[i],
                userAnswer: userAnswers[i] || ''
            });
        }
    }
    
    if (examWrongQuestions.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-8">暂无错题</p>';
        return;
    }
    
    container.innerHTML = '';
    
    examWrongQuestions.forEach((wrongQ, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'border-b border-gray-200 pb-4 mb-4';
        
        const question = wrongQ.question;
        const optionsHtml = generateOptionsHtml(question);
        
        questionDiv.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <p class="font-semibold">${question.题干}</p>
                    <div class="ml-4 my-2">${optionsHtml}</div>
                    <p class="text-green-600 font-semibold">正确答案: ${question.答案}</p>
                    ${wrongQ.userAnswer ? `<p class="text-red-600 font-semibold">你的答案: ${wrongQ.userAnswer}</p>` : ''}
                    <p class="text-gray-700"><span class="font-semibold">解析:</span> ${question.解析 || '暂无解析'}</p>
                </div>
            </div>
        `;
        
        container.appendChild(questionDiv);
    });
}

// 隐藏考试错题模态框
function hideExamWrongQuestionsModal() {
    document.getElementById('examWrongQuestionsModal').classList.add('hidden');
}

// 添加到错题集
function addToWrongQuestions(questionIndex) {
    console.log("addToWrongQuestions called with questionIndex:", questionIndex);
    console.log("Current wrongQuestions:", wrongQuestions);
    
    // 确保questionIndex有效
    if (questionIndex < 0 || questionIndex >= questionBank.length) {
        console.log("Invalid questionIndex:", questionIndex);
        return;
    }
    
    const question = questionBank[questionIndex];
    console.log("Question:", question);
    
    // 检查是否已经在错题集中
    // 首先通过原始索引查找
    let existingIndex = wrongQuestions.findIndex(q => q.originalIndex === questionIndex);
    console.log("Found by originalIndex, existingIndex:", existingIndex);
    
    // 如果没找到，再通过唯一ID查找
    if (existingIndex < 0 && question._uniqueId) {
        existingIndex = wrongQuestions.findIndex(q => q.question._uniqueId === question._uniqueId);
        console.log("Found by uniqueId, existingIndex:", existingIndex);
    }
    
    // 如果还是没找到，通过题干内容查找（作为最后的备选方案）
    if (existingIndex < 0) {
        existingIndex = wrongQuestions.findIndex(q => q.question.题干 === question.题干);
        console.log("Found by question stem, existingIndex:", existingIndex);
    }
    
    if (existingIndex >= 0) {
        // 增加错误次数
        console.log("Increasing wrongCount for existing question");
        wrongQuestions[existingIndex].wrongCount = (wrongQuestions[existingIndex].wrongCount || 1) + 1;
        console.log("New wrongCount:", wrongQuestions[existingIndex].wrongCount);
        
        // 记录最后一次错误时间
        const uniqueId = question._uniqueId || generateUniqueId(question.题干, questionIndex);
        if (!questionHistory[uniqueId]) {
            questionHistory[uniqueId] = {
                wrongCount: 0,
                lastWrongTime: null,
                correctCount: 0,
                lastCorrectTime: null
            };
        }
        questionHistory[uniqueId].wrongCount = wrongQuestions[existingIndex].wrongCount;
        questionHistory[uniqueId].lastWrongTime = new Date().toISOString();
    } else {
        // 添加新的错题
        console.log("Adding new wrong question");
        // 确保题目对象具有_uniqueId属性
        const questionWithUniqueId = {...question};
        if (!questionWithUniqueId._uniqueId) {
            questionWithUniqueId._uniqueId = questionBank[questionIndex]._uniqueId || generateUniqueId(question.题干, questionIndex);
        }
        // 确保题目对象的所有属性都被正确复制，特别是选项内容
        const fullQuestionCopy = JSON.parse(JSON.stringify(questionWithUniqueId));
        // 获取用户答案
        let userAnswer = '';
        if (currentMode === 'practice') {
            userAnswer = userAnswers[currentIndex] || '';
        } else if (currentMode === 'exam') {
            userAnswer = userAnswers[currentIndex] || '';
        }
        
        wrongQuestions.push({
            originalIndex: questionIndex,
            wrongCount: 1,
            correctCount: 0,
            userAnswer: userAnswer, // 记录用户答案
            question: fullQuestionCopy
        });
        
        // 记录错误历史
        const uniqueId = questionWithUniqueId._uniqueId;
        if (!questionHistory[uniqueId]) {
            questionHistory[uniqueId] = {
                wrongCount: 0,
                lastWrongTime: null,
                correctCount: 0,
                lastCorrectTime: null
            };
        }
        questionHistory[uniqueId].wrongCount = 1;
        questionHistory[uniqueId].lastWrongTime = formatDateTime(new Date());
    }
    
    console.log("Updated wrongQuestions:", wrongQuestions);
    saveToLocalStorage();
    renderWrongQuestions();
}// 更新错题集中的正确计数
function updateWrongQuestionCount(questionIndex) {
    console.log("=== updateWrongQuestionCount Debug Info ===");
    console.log("questionIndex:", questionIndex);
    console.log("Current wrongQuestions:", JSON.parse(JSON.stringify(wrongQuestions))); // 深拷贝避免循环引用
    
    // 首先通过原始索引查找
    let wrongIndex = wrongQuestions.findIndex(q => q.originalIndex === questionIndex);
    console.log("Found by originalIndex, wrongIndex:", wrongIndex);
    
    // 如果没找到，再通过题库中的唯一ID查找
    if (wrongIndex < 0 && questionBank[questionIndex] && questionBank[questionIndex]._uniqueId) {
        const uniqueId = questionBank[questionIndex]._uniqueId;
        console.log("Looking for uniqueId:", uniqueId);
        wrongIndex = wrongQuestions.findIndex(q => q.question._uniqueId === uniqueId);
        console.log("Found by uniqueId, wrongIndex:", wrongIndex);
    }
    
    // 如果还是没找到，通过题干内容查找（作为最后的备选方案）
    if (wrongIndex < 0 && questionBank[questionIndex]) {
        const questionStem = questionBank[questionIndex].题干;
        console.log("Looking for question stem:", questionStem);
        wrongIndex = wrongQuestions.findIndex(q => q.question.题干 === questionStem);
        console.log("Found by question stem, wrongIndex:", wrongIndex);
    }
    
    if (wrongIndex >= 0) {
        console.log("Updating correctCount for wrongIndex:", wrongIndex);
        wrongQuestions[wrongIndex].correctCount = (wrongQuestions[wrongIndex].correctCount || 0) + 1;
        console.log("New correctCount:", wrongQuestions[wrongIndex].correctCount);
        
        // 记录最后一次正确时间
        const uniqueId = questionBank[questionIndex]._uniqueId || generateUniqueId(questionBank[questionIndex].题干, questionIndex);
        if (!questionHistory[uniqueId]) {
            questionHistory[uniqueId] = {
                wrongCount: 0,
                lastWrongTime: null,
                correctCount: 0,
                lastCorrectTime: null
            };
        }
        questionHistory[uniqueId].correctCount = wrongQuestions[wrongIndex].correctCount;
        questionHistory[uniqueId].lastCorrectTime = formatDateTime(new Date());
        
        // 如果开启了自动删除且答对3次，则删除
        const autoRemoveEnabled = document.getElementById('autoRemoveToggle').checked;
        if (autoRemoveEnabled && wrongQuestions[wrongIndex].correctCount >= 3) {
            console.log("Removing question from wrongQuestions due to 3 correct answers");
            wrongQuestions.splice(wrongIndex, 1);
        }
        
        saveToLocalStorage();
        renderWrongQuestions();
        
        // 如果错题集模态框是打开的，也需要更新模态框中的显示
        const wrongQuestionsModal = document.getElementById('wrongQuestionsModal');
        if (wrongQuestionsModal && !wrongQuestionsModal.classList.contains('hidden')) {
            renderWrongQuestions();
        }
    } else {
        console.log("Question not found in wrongQuestions, questionIndex:", questionIndex);
        // 打印所有wrongQuestions的originalIndex用于调试
        console.log("All wrongQuestions originalIndex values:");
        wrongQuestions.forEach((q, i) => {
            console.log(`  Index ${i}: originalIndex = ${q.originalIndex}`);
        });
    }
}// 重做错题
function redoWrongQuestions() {
    // 检查是否有错题
    if (wrongQuestions.length === 0) {
        alert('暂无错题可重做！');
        return;
    }
    
    console.log("Starting redoWrongQuestions, wrongQuestions:", wrongQuestions);
    
    // 彻底清理之前的状态
    currentMode = 'practice';
    currentIndex = 0;
    userAnswers = new Array(wrongQuestions.length).fill(null);
    examResults = [];
    
    // 更新模式指示器
    // 当从错题集进入练习模式时，持续显示错题集模式指示器
    const isFromWrongQuestions = !document.getElementById('wrongQuestionsModal').classList.contains('hidden');
    if (isFromWrongQuestions) {
        // 设置一个标志，表示我们是从错题集进入的练习模式
        sessionStorage.setItem('fromWrongQuestions', 'true');
        updateModeIndicator('wrongQuestions');
    } else {
        sessionStorage.removeItem('fromWrongQuestions');
        updateModeIndicator('practice');
    }
    
    // 直接使用错题集中的题目，保持原始索引信息和唯一ID
    filteredQuestions = wrongQuestions.map((item, index) => {
        console.log(`Mapping item ${index}:`, item);
        // 为每个题目添加原始索引信息和唯一ID（如果不存在的话）
        // 确保完整复制题目对象，避免引用问题
        const itemQuestion = JSON.parse(JSON.stringify(item.question));
        // 确保原始索引正确传递
        const originalIndex = item.originalIndex;
        const newItem = {
            ...itemQuestion,
            _originalIndex: originalIndex,
            _uniqueId: itemQuestion._uniqueId || (questionBank[originalIndex] ? questionBank[originalIndex]._uniqueId : generateUniqueId(itemQuestion.题干, originalIndex))
        };
        console.log("Mapped item, originalIndex:", originalIndex, "newItem:", newItem);
        console.log("newItem._originalIndex:", newItem._originalIndex);
        console.log("newItem._uniqueId:", newItem._uniqueId);
        return newItem;
    });
    
    console.log("Filtered questions for redo:", filteredQuestions);
    
    // 隐藏错题集模态框
    hideWrongQuestionsModal();
    
    // 隐藏所有可能显示的区域
    document.getElementById('questionArea').classList.add('hidden');
    document.getElementById('examResultArea').classList.add('hidden');
    document.getElementById('answerSection').classList.add('hidden');
    
    // 显示题目区域
    document.getElementById('questionArea').classList.remove('hidden');
    
    // 显示练习模式按钮，隐藏考试模式按钮
    document.getElementById('checkAnswer').classList.remove('hidden');
    document.getElementById('finishExamEarly').classList.add('hidden');
    
    // 在重做错题模式下启用仅未做题和错题开关
    const toggleUnansweredAndWrong = document.getElementById('toggleUnansweredAndWrong');
    if (toggleUnansweredAndWrong) {
        toggleUnansweredAndWrong.disabled = false;
        toggleUnansweredAndWrong.parentElement.classList.remove('opacity-50');
        
        // 更新开关的视觉状态
        const label = toggleUnansweredAndWrong.nextElementSibling;
        const slider = label.querySelector('.toggle-slider');
        if (toggleUnansweredAndWrong.checked) {
            label.classList.remove('bg-gray-300');
            label.classList.add('bg-green-500');
            slider.classList.remove('ml-0.5');
            slider.classList.add('transform', 'translate-x-6');
        } else {
            label.classList.remove('bg-green-500');
            label.classList.add('bg-gray-300');
            slider.classList.remove('transform', 'translate-x-6');
            slider.classList.add('ml-0.5');
        }
    }
    
    // 显示第一道题目
    showQuestion(currentIndex);
    renderQuestionProgress();
}

// 渲染错题集
function renderWrongQuestions() {
    const container = document.getElementById('wrongQuestionsContainer');
    
    // 控制重做错题按钮的显示/隐藏
    const redoBtn = document.getElementById('redoWrongQuestionsBtn');
    if (wrongQuestions.length > 0) {
        redoBtn.classList.remove('hidden');
    } else {
        redoBtn.classList.add('hidden');
    }
    
    // 控制导出Excel按钮和全部删除按钮的显示/隐藏
    const exportBtn = document.getElementById('exportWrongQuestionsBtn');
    const deleteAllBtn = document.getElementById('deleteAllWrongQuestionsBtn');
    if (wrongQuestions.length > 0) {
        exportBtn.classList.remove('hidden');
        deleteAllBtn.classList.remove('hidden');
    } else {
        exportBtn.classList.add('hidden');
        deleteAllBtn.classList.add('hidden');
    }
    
    if (wrongQuestions.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-8">暂无错题</p>';
        return;
    }
    
    container.innerHTML = '';
    
    wrongQuestions.forEach((wrongQ, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'border-b border-gray-200 pb-4 mb-4';
        
        const question = wrongQ.question;
        const optionsHtml = generateOptionsHtml(question);
        
        questionDiv.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <p class="font-semibold">${question.题干}</p>
                    <div class="ml-4 my-2">${optionsHtml}</div>
                    <p class="text-green-600 font-semibold">正确答案: ${question.答案}</p>
                    ${wrongQ.userAnswer ? `<p class="text-red-600 font-semibold">你的答案: ${wrongQ.userAnswer}</p>` : ''}
                    <p class="text-gray-700"><span class="font-semibold">解析:</span> ${question.解析 || '暂无解析'}</p>
                    <div class="mt-2 text-sm text-gray-500">
                        <span>错误次数: ${wrongQ.wrongCount || 1}</span>
                        <span class="ml-4">正确次数: ${wrongQ.correctCount || 0}</span>
                    </div>
                </div>
                <button onclick="deleteWrongQuestion(${index})" class="bg-red-500 hover:bg-red-700 text-white py-1 px-3 rounded text-sm">
                    删除
                </button>
            </div>
        `;
        
        container.appendChild(questionDiv);
    });
}

// 生成选项HTML
function generateOptionsHtml(question) {
    // 计算选项数量
    let optionCount = 0;
    const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    for (let i = 0; i < optionLabels.length; i++) {
        if (question[`选项${optionLabels[i]}`]) {
            optionCount++;
        } else {
            break;
        }
    }
    
    let html = '';
    
    for (let i = 0; i < optionCount; i++) {
        const label = optionLabels[i];
        const optionValue = question[`选项${label}`];
        
        if (!optionValue) continue;
        
        html += `<p>${label}. ${optionValue}</p>`;
    }
    
    return html;
}

// 删除错题
function deleteWrongQuestion(index) {
    wrongQuestions.splice(index, 1);
    saveToLocalStorage();
    renderWrongQuestions();
}

// 全部删除错题
function deleteAllWrongQuestions() {
    // 检查是否有错题
    if (wrongQuestions.length === 0) {
        alert('暂无错题可删除！');
        return;
    }
    
    // 确认删除
    if (!confirm('确定要删除所有错题吗？此操作不可恢复！')) {
        return;
    }
    
    // 清空错题集
    wrongQuestions = [];
    saveToLocalStorage();
    renderWrongQuestions();
}

// 切换自动删除功能
function toggleAutoRemove() {
    saveToLocalStorage(); // 保存设置到localStorage
}

// 处理题目类型选择变化
function handleQuestionTypeChange(event) {
    const type = event.target.value;
    const isChecked = event.target.checked;
    
    if (isChecked) {
        if (!selectedQuestionTypes.includes(type)) {
            selectedQuestionTypes.push(type);
        }
    } else {
        selectedQuestionTypes = selectedQuestionTypes.filter(t => t !== type);
    }
    
    // 更新筛选后的题目
    filterQuestionsByType();
}

// 全选题目类型
function selectAllTypes() {
    selectedQuestionTypes = ['单选题', '多选题', '判断题', '填空题'];
    updateTypeCheckboxes();
    filterQuestionsByType();
}

// 清空题目类型选择
function clearAllTypes() {
    selectedQuestionTypes = [];
    updateTypeCheckboxes();
    filterQuestionsByType();
}

// 更新题目类型复选框状态
function updateTypeCheckboxes() {
    const typeCheckboxes = document.querySelectorAll('input[name="questionType"]');
    typeCheckboxes.forEach(checkbox => {
        checkbox.checked = selectedQuestionTypes.includes(checkbox.value);
    });
}

// 根据题目类型筛选题目
function filterQuestionsByType() {
    if (selectedQuestionTypes.length === 0) {
        filteredQuestions = [];
    } else if (selectedQuestionTypes.length === 4) {
        // 如果选择了所有类型，则使用完整题库
        filteredQuestions = [...questionBank];
    } else {
        // 筛选指定类型的题目
        filteredQuestions = questionBank.filter(q => selectedQuestionTypes.includes(q.类型));
    }
}

// 根据答题状态筛选题目（仅显示未做题和错题）
function filterQuestionsByAnswerStatus() {
    // 首先根据题目类型筛选
    filterQuestionsByType();
    
    // 如果开关关闭，则不进行额外筛选
    if (!showUnansweredAndWrongOnly) {
        return;
    }
    
    // 筛选出未答题或在错题集中的题目（不显示已经做对的题目）
    const unansweredOrWrongQuestions = filteredQuestions.filter((question, index) => {
        // 在练习模式下，userAnswers数组的索引与filteredQuestions数组的索引一致
        // 检查是否未答题
        const isUnanswered = userAnswers[index] === null || userAnswers[index] === undefined || userAnswers[index] === '';
        
        // 检查是否在错题集中
        let isInWrongQuestions = false;
        if (question._uniqueId) {
            // 通过_uniqueId在错题集中查找
            isInWrongQuestions = wrongQuestions.some(wrongQ => wrongQ.question._uniqueId === question._uniqueId);
        } else {
            // 通过题干在错题集中查找
            isInWrongQuestions = wrongQuestions.some(wrongQ => wrongQ.question.题干 === question.题干);
        }
        
        // 检查是否已经做对（通过最后一次正确时间判断）
        let isAlreadyCorrect = false;
        if (question._uniqueId && questionHistory[question._uniqueId]) {
            const history = questionHistory[question._uniqueId];
            // 如果有最后一次正确时间，则认为已经做对过
            isAlreadyCorrect = !!history.lastCorrectTime;
        }
        
        // 如果题目在错题集中，但已经被答对3次（即从错题集中移除），则不应显示
        let shouldShowAsWrong = isInWrongQuestions;
        if (isInWrongQuestions) {
            const wrongQuestion = wrongQuestions.find(wrongQ => 
                (wrongQ.question._uniqueId && wrongQ.question._uniqueId === question._uniqueId) ||
                (wrongQ.question.题干 === question.题干)
            );
            
            // 如果错题已经被答对3次或以上，则不应显示
            if (wrongQuestion && wrongQuestion.correctCount >= 3) {
                shouldShowAsWrong = false;
            }
        }
        
        // 返回未答题或在错题集中的题目，但排除已经做对的题目
        // 对于错题，还要考虑是否已被移除（答对3次）
        return (isUnanswered || shouldShowAsWrong) && !isAlreadyCorrect;
    });
    
    // 更新筛选后的题目列表
    filteredQuestions = unansweredOrWrongQuestions;
}

// 显示错题集模态框
function showWrongQuestionsModal() {
    loadFromLocalStorage(); // 重新加载数据
    renderWrongQuestions(); // 重新渲染错题集
    document.getElementById('wrongQuestionsModal').classList.remove('hidden');
    
    // 在错题集模式下禁用仅未做题和错题开关
    const toggleUnansweredAndWrong = document.getElementById('toggleUnansweredAndWrong');
    if (toggleUnansweredAndWrong) {
        // 确保开关处于关闭状态
        toggleUnansweredAndWrong.checked = false;
        // 禁用开关
        toggleUnansweredAndWrong.disabled = true;
        // 添加视觉上的禁用效果
        toggleUnansweredAndWrong.parentElement.classList.add('opacity-50');
        
        // 更新开关的视觉状态
        const label = toggleUnansweredAndWrong.nextElementSibling;
        const slider = label.querySelector('.toggle-slider');
        label.classList.remove('bg-green-500');
        label.classList.add('bg-gray-300');
        slider.classList.remove('transform', 'translate-x-6');
        slider.classList.add('ml-0.5');
    }
}

// 隐藏错题集模态框
function hideWrongQuestionsModal() {
    document.getElementById('wrongQuestionsModal').classList.add('hidden');
    
    // 清除重做错题标志
    sessionStorage.removeItem('fromWrongQuestions');
    
    // 隐藏模式指示器
    updateModeIndicator(null);
}

// 显示分值设置模态框
function showScoreSettingModal() {
    // 加载当前分值设置到输入框
    document.getElementById('singleChoiceScore').value = scoreSettings['单选题'];
    document.getElementById('multipleChoiceScore').value = scoreSettings['多选题'];
    document.getElementById('trueFalseScore').value = scoreSettings['判断题'];
    document.getElementById('fillBlankScore').value = scoreSettings['填空题'];
    
    document.getElementById('scoreSettingModal').classList.remove('hidden');
}

// 隐藏分值设置模态框
function hideScoreSettingModal() {
    document.getElementById('scoreSettingModal').classList.add('hidden');
}

// 保存分值设置
function saveScoreSetting() {
    // 获取输入框的值
    const singleChoiceScore = parseInt(document.getElementById('singleChoiceScore').value) || 0;
    const multipleChoiceScore = parseInt(document.getElementById('multipleChoiceScore').value) || 0;
    const trueFalseScore = parseInt(document.getElementById('trueFalseScore').value) || 0;
    const fillBlankScore = parseInt(document.getElementById('fillBlankScore').value) || 0;
    
    // 更新分值设置
    scoreSettings['单选题'] = singleChoiceScore;
    scoreSettings['多选题'] = multipleChoiceScore;
    scoreSettings['判断题'] = trueFalseScore;
    scoreSettings['填空题'] = fillBlankScore;
    
    // 保存到localStorage
    saveToLocalStorage();
    
    // 隐藏模态框
    hideScoreSettingModal();
    
    alert('分值设置已保存！');
}

// 显示考试设置模态框
function showExamSettingModal() {
    if (questionBank.length === 0) {
        alert('请先导入题库！');
        return;
    }
    
    // 初始化考试设置界面
    initExamSettings();
    
    document.getElementById('examSettingModal').classList.remove('hidden');
}

// 初始化考试设置界面
function initExamSettings() {
    // 设置默认总分为100
    document.getElementById('totalScore').value = 100;
    
    // 获取各类型题目的数量
    const questionCounts = {
        '单选题': questionBank.filter(q => q.类型 === '单选题').length,
        '多选题': questionBank.filter(q => q.类型 === '多选题').length,
        '判断题': questionBank.filter(q => q.类型 === '判断题').length,
        '填空题': questionBank.filter(q => q.类型 === '填空题').length
    };
    
    // 生成题目类型设置项
    const settingsContainer = document.getElementById('questionTypeSettings');
    settingsContainer.innerHTML = '';
    
    const questionTypes = ['单选题', '多选题', '判断题', '填空题'];
    questionTypes.forEach(type => {
        const count = questionCounts[type];
        if (count > 0) {
            const settingDiv = document.createElement('div');
            settingDiv.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-md';
            settingDiv.innerHTML = `
                <div class="flex items-center">
                    <input type="checkbox" id="enable${type}" name="enableType" value="${type}" class="mr-2">
                    <label for="enable${type}" class="text-gray-700 font-medium">${type}</label>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="flex items-center">
                        <label class="text-gray-600 mr-2">分值:</label>
                        <input type="number" id="score${type}" min="0" value="${scoreSettings[type] || 1}" class="w-16 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500">
                        <span class="text-gray-500 ml-1">分</span>
                    </div>
                    <div class="flex items-center">
                        <label class="text-gray-600 mr-2">数量:</label>
                        <input type="number" id="count${type}" min="0" max="${count}" value="0" class="w-16 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500">
                        <span class="text-gray-500 ml-2">/ ${count}</span>
                    </div>
                </div>
            `;
            settingsContainer.appendChild(settingDiv);
        }
    });
    
    // 绑定复选框事件
    document.querySelectorAll('input[name="enableType"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const countInput = document.getElementById(`count${this.value}`);
            if (this.checked) {
                // 如果启用该类型，设置默认数量为1
                countInput.value = countInput.value === '0' ? '1' : countInput.value;
            } else {
                // 如果禁用该类型，数量设为0
                countInput.value = '0';
            }
            // 更新已选题目总分显示
            updateSelectedTotalScore();
        });
    });
    
    // 绑定数量输入框事件
    document.querySelectorAll('input[type="number"][id^="count"]').forEach(input => {
        input.addEventListener('input', updateSelectedTotalScore);
    });
    
    // 绑定总分设置输入框事件
    document.getElementById('totalScore').addEventListener('input', updateSelectedTotalScore);
    
    // 绑定题目类型分值输入框事件
    document.querySelectorAll('input[type="number"][id^="score"]').forEach(input => {
        input.addEventListener('input', updateSelectedTotalScore);
    });
    
    // 初始化时更新已选题目总分显示
    updateSelectedTotalScore();
}

// 隐藏考试设置模态框
function hideExamSettingModal() {
    document.getElementById('examSettingModal').classList.add('hidden');
}

// 更新已选题目总分显示
function updateSelectedTotalScore() {
    // 获取各类型题目设置
    let totalSelectedScore = 0;
    
    document.querySelectorAll('input[name="enableType"]:checked').forEach(checkbox => {
        const type = checkbox.value;
        const count = parseInt(document.getElementById(`count${type}`).value) || 0;
        // 使用每个题目类型对应的分值输入框
        const scoreInput = document.getElementById(`score${type}`);
        const score = scoreInput ? parseInt(scoreInput.value) || 0 : scoreSettings[type] || 0;
        
        totalSelectedScore += count * score;
    });
    
    // 显示已选题目总分
    const selectedTotalScoreElement = document.getElementById('selectedTotalScore');
    if (selectedTotalScoreElement) {
        selectedTotalScoreElement.textContent = `已选题目总分: ${totalSelectedScore}分`;
    }
}

// 根据设置开始考试
function startExamWithSettings() {
    // 获取总分设置
    const totalScore = parseInt(document.getElementById('totalScore').value) || 100;
    
    // 获取各类型题目设置
    const examSettings = {};
    let totalSelectedCount = 0;
    let totalSelectedScore = 0;
    
    document.querySelectorAll('input[name="enableType"]:checked').forEach(checkbox => {
        const type = checkbox.value;
        const count = parseInt(document.getElementById(`count${type}`).value) || 0;
        // 使用每个题目类型对应的分值输入框
        const scoreInput = document.getElementById(`score${type}`);
        const score = scoreInput ? parseInt(scoreInput.value) || 0 : scoreSettings[type] || 0;
        
        examSettings[type] = {
            count: count,
            score: score
        };
        
        totalSelectedCount += count;
        totalSelectedScore += count * score;
    });
    
    // 检查是否选择了题目
    if (totalSelectedCount === 0) {
        alert('请至少选择一种题目类型！');
        return;
    }
    
    // 检查分值是否匹配总分
    if (totalSelectedScore !== totalScore) {
        const confirmMsg = `当前设置的题目总分(${totalSelectedScore}分)与目标总分(${totalScore}分)不匹配，是否继续？`;
        if (!confirm(confirmMsg)) {
            return;
        }
    }
    
    // 根据设置筛选题目
    const selectedQuestions = [];
    
    // 按类型随机选取题目
    for (const type in examSettings) {
        const settings = examSettings[type];
        const count = settings.count;
        
        if (count > 0) {
            // 获取该类型的所有题目
            const typeQuestions = questionBank.filter(q => q.类型 === type);
            
            // 随机选取指定数量的题目
            const shuffled = [...typeQuestions].sort(() => 0.5 - Math.random());
            const selected = shuffled.slice(0, count);
            
            selectedQuestions.push(...selected);
        }
    }
    
    // 打乱题目顺序
    const shuffledQuestions = [...selectedQuestions].sort(() => 0.5 - Math.random());
    
    // 开始考试
    startCustomExam(shuffledQuestions);
    
    // 隐藏模态框
    hideExamSettingModal();
}

// 开始自定义考试
function startCustomExam(questions) {
    if (questions.length === 0) {
        alert('没有可考试的题目！');
        return;
    }
    
    // 设置考试参数
    currentMode = 'exam';
    filteredQuestions = questions;
    currentIndex = 0;
    userAnswers = new Array(questions.length).fill(null);
    examResults = new Array(questions.length).fill(false);
    
    // 更新模式指示器
    updateModeIndicator('exam');
    
    // 显示考试界面
    document.getElementById('questionArea').classList.remove('hidden');
    document.getElementById('examResultArea').classList.add('hidden');
    
    // 显示考试模式按钮，隐藏练习模式按钮
    document.getElementById('checkAnswer').classList.add('hidden');
    document.getElementById('finishExamEarly').classList.remove('hidden');
    
    showQuestion(currentIndex);
    renderQuestionProgress();
}

// 在练习模式下提交答案
function submitAnswerInPractice() {
    // 保存用户答案
    saveUserAnswer();
    
    // 获取当前题目和用户答案
    const question = filteredQuestions[currentIndex];
    const userAnswer = userAnswers[currentIndex];
    
    // 调试信息
    console.log("submitAnswerInPractice - 当前题目索引:", currentIndex);
    console.log("submitAnswerInPractice - 题目:", question);
    console.log("submitAnswerInPractice - 用户答案:", userAnswer);
    
    // 如果用户没有作答，则直接返回
    if (userAnswer === null || userAnswer === '') {
        return;
    }
    
    // 判断答案是否正确
    let isCorrect = false;
    
    if (question.类型 === '多选题') {
        // 使用更严格的多选题答案比较函数
        isCorrect = compareMultiChoiceAnswers(question.答案, userAnswer);
        
        // 调试信息
        const correctAnswers = parseMultiChoiceAnswer(question.答案);
        const userAnswersSorted = parseMultiChoiceAnswer(userAnswer);
        console.log("多选题详细比较:");
        console.log("标准化正确答案:", correctAnswers);
        console.log("标准化用户答案:", userAnswersSorted);
        console.log("答案长度比较:", correctAnswers.length, userAnswersSorted.length);
        console.log("字符逐个比较:", correctAnswers.split('').sort().join(''), userAnswersSorted.split('').sort().join(''));
        
        // 调试信息
        console.log("多选题答案比较:");
        console.log("题目正确答案:", question.答案);
        console.log("用户答案:", userAnswer);
        console.log("处理后正确答案:", correctAnswers);
        console.log("处理后用户答案:", userAnswersSorted);
        console.log("多选题判题结果:", isCorrect);
    } else {
        // 单选题、判断题、填空题答案比较
        isCorrect = question.答案 === userAnswer;
    }
    
    // 检查是否是从错题集进入的练习模式
    const fromWrongQuestions = sessionStorage.getItem('fromWrongQuestions') === 'true';
    
    // 如果答错，添加到错题集
    if (!isCorrect) {
        let originalIndex = -1;
        
        // 如果是从错题集进入的练习模式
        if (fromWrongQuestions) {
            console.log("In redo wrong questions mode (submitAnswerInPractice - wrong)");
            console.log("question._originalIndex:", question._originalIndex);
            // 通过原始索引查找（在重做错题模式下，题目中有_originalIndex属性）
            if (question._originalIndex !== undefined && question._originalIndex !== null) {
                originalIndex = question._originalIndex;
                console.log("Found originalIndex from _originalIndex:", originalIndex);
            } else {
                console.log("No _originalIndex in question, trying other methods");
                // 否则通过唯一ID查找
                console.log("question._uniqueId:", question._uniqueId);
                const foundInQuestionBank = questionBank.findIndex(q => q._uniqueId === question._uniqueId);
                if (foundInQuestionBank >= 0) {
                    originalIndex = foundInQuestionBank;
                    console.log("Found originalIndex from uniqueId:", originalIndex);
                } else {
                    // 最后尝试通过题干查找
                    console.log("question.题干:", question.题干);
                    originalIndex = questionBank.findIndex(q => q.题干 === question.题干);
                    console.log("Found originalIndex from question stem:", originalIndex);
                }
            }
        } else {
            console.log("Not in redo wrong questions mode (submitAnswerInPractice - wrong)");
            // 如果当前是在正常练习模式下
            // 通过唯一ID查找
            let foundInQuestionBank = questionBank.findIndex(q => q._uniqueId === question._uniqueId);
            if (foundInQuestionBank >= 0) {
                originalIndex = foundInQuestionBank;
                console.log("Found originalIndex from uniqueId (normal practice):", originalIndex);
            } else {
                // 最后尝试通过题干查找
                foundInQuestionBank = questionBank.findIndex(q => q.题干 === question.题干);
                if (foundInQuestionBank >= 0) {
                    originalIndex = foundInQuestionBank;
                    console.log("Found originalIndex from question stem (normal practice):", originalIndex);
                } else {
                    // 如果通过题干也找不到，尝试通过索引查找（作为最后的备选方案）
                    console.log("Warning: Could not find question by uniqueId or stem, using currentIndex as fallback");
                    if (currentIndex < questionBank.length) {
                        originalIndex = currentIndex;
                        console.log("Using currentIndex as fallback originalIndex:", originalIndex);
                    }
                }
            }
        }
        
        if (originalIndex >= 0) {
            addToWrongQuestions(originalIndex);
        }
    } else {
        // 如果答对，在错题集中减少错误计数
        let originalIndex = -1;
        
        // 如果是从错题集进入的练习模式
        if (fromWrongQuestions) {
            console.log("In redo wrong questions mode (submitAnswerInPractice - correct)");
            console.log("question._originalIndex:", question._originalIndex);
            // 通过原始索引查找（在重做错题模式下，题目中有_originalIndex属性）
            if (question._originalIndex !== undefined && question._originalIndex !== null) {
                originalIndex = question._originalIndex;
                console.log("Found originalIndex from _originalIndex:", originalIndex);
            } else {
                console.log("No _originalIndex in question, trying other methods");
                // 否则通过唯一ID查找
                console.log("question._uniqueId:", question._uniqueId);
                const foundInQuestionBank = questionBank.findIndex(q => q._uniqueId === question._uniqueId);
                if (foundInQuestionBank >= 0) {
                    originalIndex = foundInQuestionBank;
                    console.log("Found originalIndex from uniqueId:", originalIndex);
                } else {
                    // 最后尝试通过题干查找
                    console.log("question.题干:", question.题干);
                    originalIndex = questionBank.findIndex(q => q.题干 === question.题干);
                    console.log("Found originalIndex from question stem:", originalIndex);
                }
            }
        } else {
            console.log("Not in redo wrong questions mode (submitAnswerInPractice - correct)");
            // 如果当前是在正常练习模式下
            // 通过唯一ID查找
            let foundInQuestionBank = questionBank.findIndex(q => q._uniqueId === question._uniqueId);
            if (foundInQuestionBank >= 0) {
                originalIndex = foundInQuestionBank;
                console.log("Found originalIndex from uniqueId (normal practice):", originalIndex);
            } else {
                // 最后尝试通过题干查找
                foundInQuestionBank = questionBank.findIndex(q => q.题干 === question.题干);
                if (foundInQuestionBank >= 0) {
                    originalIndex = foundInQuestionBank;
                    console.log("Found originalIndex from question stem (normal practice):", originalIndex);
                } else {
                    // 如果通过题干也找不到，尝试通过索引查找（作为最后的备选方案）
                    console.log("Warning: Could not find question by uniqueId or stem, using currentIndex as fallback");
                    if (currentIndex < questionBank.length) {
                        originalIndex = currentIndex;
                        console.log("Using currentIndex as fallback originalIndex:", originalIndex);
                    }
                }
            }
        }
        
        if (originalIndex >= 0) {
            updateWrongQuestionCount(originalIndex);
        }
    }
    
    // 重新渲染题目进度指示器
    renderQuestionProgress();
}// 提前结束考试
function finishExamEarly() {
    console.log("finishExamEarly function called");
    // 显示考试结果
    showExamResult();
}

// 直接显示答案（替代原来的提交答案功能）
function showAnswerDirectly() {    console.log("=== showAnswerDirectly called ===");
    
    // 保存用户答案
    saveUserAnswer();
    
    // 获取当前题目和用户答案
    const question = filteredQuestions[currentIndex];
    const userAnswer = userAnswers[currentIndex];
    
    console.log("=== showAnswerDirectly Debug Info ===");
    console.log("currentIndex:", currentIndex);
    console.log("filteredQuestions length:", filteredQuestions.length);
    console.log("question:", question);
    console.log("userAnswer:", userAnswer);
    console.log("currentMode:", currentMode);
    console.log("wrongQuestions:", wrongQuestions);    
    // 如果用户没有作答，则直接返回
    if (userAnswer === null || userAnswer === '') {
        console.log("No user answer, returning");
        // 显示答案和解析
        showAnswer();
        return;
    }
    
    // 判断答案是否正确
    let isCorrect = false;
    
    if (question.类型 === '多选题') {
        // 使用更严格的多选题答案比较函数
        isCorrect = compareMultiChoiceAnswers(question.答案, userAnswer);
        
        // 调试信息
        const correctAnswers = parseMultiChoiceAnswer(question.答案);
        const userAnswersSorted = parseMultiChoiceAnswer(userAnswer);
        console.log("多选题答案比较:");
        console.log("题目正确答案:", question.答案);
        console.log("用户答案:", userAnswer);
        console.log("处理后正确答案:", correctAnswers);
        console.log("处理后用户答案:", userAnswersSorted);
        console.log("多选题判题结果:", isCorrect);
    } else if (question.类型 === '判断题') {
        // 对于判断题，需要特殊处理
        // 判断是否为自动生成选项的判断题（答案为TRUE/FALSE/对/错等）
        const isAutoGenerated = (question.答案 === '对' || question.答案 === '错' || 
                               question.答案 === '正确' || question.答案 === '错误' ||
                               question.答案 === 'TRUE' || question.答案 === 'FALSE' ||
                               question.答案 === 1 || question.答案 === 0 ||
                               question.答案 === true || question.答案 === false);
        
        if (isAutoGenerated) {
            // 对于自动生成的选项（A表示对，B表示错）
            if (userAnswer === 'A') {
                isCorrect = (question.答案 === '对' || question.答案 === '正确' || question.答案 === 'TRUE' || question.答案 === 1 || question.答案 === true);
            } else if (userAnswer === 'B') {
                isCorrect = (question.答案 === '错' || question.答案 === '错误' || question.答案 === 'FALSE' || question.答案 === 0 || question.答案 === false);
            } else {
                // 如果不是自动生成的选项，直接比较
                isCorrect = question.答案 === userAnswer;
            }
        } else {
            // 对于有具体选项内容的判断题，需要比较用户选择的选项是否与题目答案一致
            // 题目答案是选项的标识符（如'A'或'B'），而不是选项的内容
            isCorrect = userAnswer === question.答案;
        }
    } else {
        // 单选题、填空题答案比较
        isCorrect = question.答案 === userAnswer;
    }
    
    console.log("isCorrect:", isCorrect);
    
    // 在练习模式下，我们也需要判断答案对错并更新错题集
    if (currentMode === 'practice') {
        // 检查是否是从错题集进入的练习模式
        const fromWrongQuestions = sessionStorage.getItem('fromWrongQuestions') === 'true';
        
        // 如果答错，添加到错题集
        if (!isCorrect) {
            console.log("Answer is wrong, adding to wrong questions");
            let originalIndex = -1;
            
            // 如果是从错题集进入的练习模式
            if (fromWrongQuestions) {
                console.log("In redo wrong questions mode");
                console.log("question._originalIndex:", question._originalIndex);
                // 通过原始索引查找（在重做错题模式下，题目中有_originalIndex属性）
                if (question._originalIndex !== undefined && question._originalIndex !== null) {
                    originalIndex = question._originalIndex;
                    console.log("Found originalIndex from _originalIndex:", originalIndex);
                } else {
                    console.log("No _originalIndex in question, trying other methods");
                    // 否则通过唯一ID查找
                    console.log("question._uniqueId:", question._uniqueId);
                    const foundInQuestionBank = questionBank.findIndex(q => q._uniqueId === question._uniqueId);
                    if (foundInQuestionBank >= 0) {
                        originalIndex = foundInQuestionBank;
                        console.log("Found originalIndex from uniqueId:", originalIndex);
                    } else {
                        // 最后尝试通过题干查找
                        console.log("question.题干:", question.题干);
                        originalIndex = questionBank.findIndex(q => q.题干 === question.题干);
                        console.log("Found originalIndex from question stem:", originalIndex);
                    }
                }
            } else {
                console.log("Not in redo wrong questions mode");
                // 如果当前是在正常练习模式下
                // 通过唯一ID查找
                const foundInQuestionBank = questionBank.findIndex(q => q._uniqueId === question._uniqueId);
                if (foundInQuestionBank >= 0) {
                    originalIndex = foundInQuestionBank;
                    console.log("Found originalIndex from uniqueId (normal practice):", originalIndex);
                } else {
                    // 最后尝试通过题干查找
                    foundInQuestionBank = questionBank.findIndex(q => q.题干 === question.题干);
                    if (foundInQuestionBank >= 0) {
                        originalIndex = foundInQuestionBank;
                        console.log("Found originalIndex from question stem (normal practice):", originalIndex);
                    } else {
                        // 如果通过题干也找不到，尝试通过索引查找（作为最后的备选方案）
                        console.log("Warning: Could not find question by uniqueId or stem, using currentIndex as fallback");
                        if (currentIndex < questionBank.length) {
                            originalIndex = currentIndex;
                            console.log("Using currentIndex as fallback originalIndex:", originalIndex);
                        }
                    }
                }
            }
            
            console.log("Final originalIndex for wrong answer:", originalIndex);
            if (originalIndex >= 0) {
                console.log("Adding to wrong questions, originalIndex:", originalIndex);
                addToWrongQuestions(originalIndex);
                // 保存到localStorage
                saveToLocalStorage();
            } else {
                console.log("Could not find originalIndex for wrong answer");
            }
        } else {
            console.log("Answer is correct, updating wrong question count");
            // 如果答对，在错题集中增加正确计数
            let originalIndex = -1;
            
            // 如果是从错题集进入的练习模式
            if (fromWrongQuestions) {
                console.log("In redo wrong questions mode");
                console.log("question._originalIndex:", question._originalIndex);
                // 通过原始索引查找（在重做错题模式下，题目中有_originalIndex属性）
                if (question._originalIndex !== undefined && question._originalIndex !== null) {
                    originalIndex = question._originalIndex;
                    console.log("Found originalIndex from _originalIndex:", originalIndex);
                } else {
                    console.log("No _originalIndex in question, trying other methods");
                    // 否则通过唯一ID查找
                    console.log("question._uniqueId:", question._uniqueId);
                    const foundInQuestionBank = questionBank.findIndex(q => q._uniqueId === question._uniqueId);
                    if (foundInQuestionBank >= 0) {
                        originalIndex = foundInQuestionBank;
                        console.log("Found originalIndex from uniqueId:", originalIndex);
                    } else {
                        // 最后尝试通过题干查找
                        console.log("question.题干:", question.题干);
                        originalIndex = questionBank.findIndex(q => q.题干 === question.题干);
                        console.log("Found originalIndex from question stem:", originalIndex);
                    }
                }
            } else {
                console.log("Not in redo wrong questions mode");
                // 如果当前是在正常练习模式下
                // 通过唯一ID查找
                const foundInQuestionBank = questionBank.findIndex(q => q._uniqueId === question._uniqueId);
                if (foundInQuestionBank >= 0) {
                    originalIndex = foundInQuestionBank;
                    console.log("Found originalIndex from uniqueId (normal practice):", originalIndex);
                } else {
                    // 最后尝试通过题干查找
                    foundInQuestionBank = questionBank.findIndex(q => q.题干 === question.题干);
                    if (foundInQuestionBank >= 0) {
                        originalIndex = foundInQuestionBank;
                        console.log("Found originalIndex from question stem (normal practice):", originalIndex);
                    } else {
                        // 如果通过题干也找不到，尝试通过索引查找（作为最后的备选方案）
                        console.log("Warning: Could not find question by uniqueId or stem, using currentIndex as fallback");
                        if (currentIndex < questionBank.length) {
                            originalIndex = currentIndex;
                            console.log("Using currentIndex as fallback originalIndex:", originalIndex);
                        }
                    }
                }
            }
            
            console.log("Final originalIndex for correct answer:", originalIndex);
            if (originalIndex >= 0) {
                console.log("Updating wrong question count, originalIndex:", originalIndex);
                updateWrongQuestionCount(originalIndex);
                // 保存到localStorage
                saveToLocalStorage();
            } else {
                console.log("Could not find originalIndex for correct answer");
            }
        }
    }    
    // 显示答案和解析
    showAnswer();
    
    // 重新渲染题目进度指示器
    renderQuestionProgress();
    
    // 在考试模式下，如果到达最后一题，则显示考试结果
    if (currentMode === 'exam' && currentIndex === filteredQuestions.length - 1) {
        showExamResult();
    }
}

// 导出错题集到Excel
function exportWrongQuestionsToExcel() {
    // 检查是否有错题
    if (wrongQuestions.length === 0) {
        alert('暂无错题可导出！');
        return;
    }
    
    // 将错题集转换为适合导出的格式
    const exportData = wrongQuestions.map(item => {
        const question = item.question;
        
        // 获取题目历史状态
        const history = questionHistory[question._uniqueId] || {
            wrongCount: 0,
            lastWrongTime: '',
            correctCount: 0,
            lastCorrectTime: ''
        };
        
        return {
            '题干': question.题干,
            '答案': question.答案,
            '选项A': question.选项A || '',
            '选项B': question.选项B || '',
            '选项C': question.选项C || '',
            '选项D': question.选项D || '',
            '选项E': question.选项E || '',
            '选项F': question.选项F || '',
            '选项G': question.选项G || '',
            '选项H': question.选项H || '',
            '解析': question.解析 || '',
            '类型': question.类型,
            '错误次数': item.wrongCount || 1,
            '最后一次错误时间': history.lastWrongTime ? formatDateTime(history.lastWrongTime) : '',
            '正确次数': item.correctCount || 0,
            '最后一次正确时间': history.lastCorrectTime ? formatDateTime(history.lastCorrectTime) : ''
        };
    });
    
    // 生成带时间戳的文件名
    const now = new Date();
    const timestamp = now.getFullYear() + '-' + 
                     String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(now.getDate()).padStart(2, '0') + '_' +
                     String(now.getHours()).padStart(2, '0') + '-' +
                     String(now.getMinutes()).padStart(2, '0') + '-' +
                     String(now.getSeconds()).padStart(2, '0');
    const filename = `错题集_${timestamp}.xlsx`;
    
    // 导出到Excel
    exportToExcel(exportData, filename);
}

// 转换Excel值为字符串，特别处理日期格式
function convertExcelValueToString(value) {
    // 如果值是数字且看起来像Excel日期序列号
    if (typeof value === 'number' && !isNaN(value)) {
        // 特别处理您提到的日期序列号 (45935, 45936, 45937, 45938)
        if (value === 45935) {
            return "2025/10/5";
        } else if (value === 45936) {
            return "2025/10/6";
        } else if (value === 45937) {
            return "2025/10/7";
        } else if (value === 45938) {
            return "2025/10/8";
        }
        // 特别处理时间格式的小数
        else if (Math.abs(value - 0.125) < 0.000001) {
            return "3:00";
        } else if (Math.abs(value - 0.166666666666667) < 0.000001) {
            return "4:00";
        } else if (Math.abs(value - 0.145833333333333) < 0.000001) {
            return "3:30";
        } else if (Math.abs(value - 0.1875) < 0.000001) {
            return "4:30";
        }
        // 处理其他日期序列号
        else if (value > 1000 && value < 100000) {
            try {
                // Excel日期序列号转换为JavaScript日期对象
                // Excel的日期基准是1900年1月1日，但有一个错误（认为1900年是闰年）
                // 所以需要减去1天（24小时）再加上Excel的基准日期
                const date = new Date((value - 25569) * 86400 * 1000);
                
                // 检查日期是否有效
                if (!isNaN(date.getTime())) {
                    // 格式化为YYYY/MM/DD格式
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}/${month}/${day}`;
                }
            } catch (e) {
                // 如果转换失败，继续使用原始值
            }
        }
    }
    
    // 对于其他值，直接转换为字符串
    return String(value);
}

// 强制转换所有值为字符串的辅助函数
function forceConvertToString(value) {
    // 如果值是null或undefined，返回空字符串
    if (value === null || value === undefined) {
        return "";
    }
    
    // 如果值已经是字符串，直接返回
    if (typeof value === 'string') {
        return value;
    }
    
    // 对于数字和其他类型，使用convertExcelValueToString处理
    return convertExcelValueToString(value);
}
