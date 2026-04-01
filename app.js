// 低压电工证考试练习系统 - 主逻辑
// 使用内嵌数据版本

// 应用状态
const AppState = {
    questions: ALL_QUESTIONS || [],    // 使用全局数据
    currentIndex: 0,
    answeredCount: 0,
    correctCount: 0,
    selectedAnswer: null,
    mode: 'sequential'
};

// DOM 元素
const DOM = {
    questionText: document.getElementById('question-text'),
    questionType: document.getElementById('question-type'),
    questionId: document.getElementById('question-id'),
    optionsContainer: document.getElementById('options-container'),
    questionImageContainer: document.getElementById('question-image-container'),
    resultPanel: document.getElementById('result-panel'),
    resultContent: document.getElementById('result-content'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    submitBtn: document.getElementById('submit-btn'),
    currentIndexSpan: document.getElementById('current-index'),
    totalQuestionsSpan: document.getElementById('total-questions'),
    progressBar: document.getElementById('progress-bar'),
    accuracyRate: document.getElementById('accuracy-rate'),
    answeredCount: document.getElementById('answered-count'),
    correctCount: document.getElementById('correct-count'),
    wrongCount: document.getElementById('wrong-count'),
    totalCount: document.getElementById('total-count'),
    totalCountBottom: document.getElementById('total-count-bottom')
};

// 初始化应用
function initApp() {
    // 检查数据是否加载
    if (!AppState.questions || AppState.questions.length === 0) {
        console.error('题库数据未加载');
        DOM.questionText.textContent = '题库数据加载失败，请检查 questions_data.js 文件';
        return;
    }

    const total = AppState.questions.length;

    // 更新UI显示总数
    DOM.totalQuestionsSpan.textContent = total;
    DOM.totalCount.textContent = total;
    DOM.totalCountBottom.textContent = total;

    // 加载本地存储的进度
    loadProgress();

    // 显示第一题
    showQuestion(AppState.currentIndex);

    // 绑定事件
    bindEvents();

    console.log('应用初始化完成，题库大小:', total);
}

// 加载进度
function loadProgress() {
    const saved = localStorage.getItem('electricianProgress');
    if (saved) {
        try {
            const progress = JSON.parse(saved);
            AppState.answeredCount = progress.answeredCount || 0;
            AppState.correctCount = progress.correctCount || 0;
            updateStatistics();
        } catch (e) {
            console.warn('加载进度失败:', e);
        }
    }
}

// 保存进度
function saveProgress() {
    const progress = {
        answeredCount: AppState.answeredCount,
        correctCount: AppState.correctCount,
        lastQuestionIndex: AppState.currentIndex
    };
    localStorage.setItem('electricianProgress', JSON.stringify(progress));
}

// 显示题目
function showQuestion(index) {
    if (index < 0 || index >= AppState.questions.length) return;

    AppState.currentIndex = index;
    const question = AppState.questions[index];

    // 重置状态
    AppState.selectedAnswer = null;

    // 更新基本信息
    DOM.questionText.textContent = question.question;
    DOM.questionType.textContent = question.type === 'single' ? '单选题' : '判断题';
    DOM.questionId.textContent = `#${question.id}`;
    DOM.currentIndexSpan.textContent = index + 1;

    // 更新进度条
    const progress = ((index + 1) / AppState.questions.length) * 100;
    DOM.progressBar.value = progress;

    // 清空图片容器
    DOM.questionImageContainer.innerHTML = '';

    // 显示题干图片
    if (question.questionImage) {
        const img = document.createElement('img');
        img.src = question.questionImage;
        img.className = 'question-image';
        img.alt = '题目图片';
        DOM.questionImageContainer.appendChild(img);
    }

    // 生成选项
    renderOptions(question);

    // 隐藏结果面板
    DOM.resultPanel.classList.remove('is-active');
    DOM.resultContent.innerHTML = '';

    // 更新按钮状态
    updateButtonStates();
}

// 渲染选项
function renderOptions(question) {
    DOM.optionsContainer.innerHTML = '';

    if (question.type === 'single') {
        question.options.forEach(option => {
            const optionElement = createOptionElement(option);
            DOM.optionsContainer.appendChild(optionElement);
        });
    } else {
        // 判断题
        const rightOption = createOptionElement({ id: '对', text: '对', image: null });
        const wrongOption = createOptionElement({ id: '错', text: '错', image: null });
        DOM.optionsContainer.appendChild(rightOption);
        DOM.optionsContainer.appendChild(wrongOption);
    }
}

// 创建选项元素
function createOptionElement(option) {
    const div = document.createElement('div');
    div.className = 'box option-box is-clickable';
    div.dataset.optionId = option.id;

    const content = document.createElement('div');
    content.className = 'content';

    const textDiv = document.createElement('div');
    textDiv.className = 'level is-mobile';

    const leftDiv = document.createElement('div');
    leftDiv.className = 'level-left';

    const optionIdSpan = document.createElement('span');
    optionIdSpan.className = 'tag is-medium is-info mr-3';
    optionIdSpan.textContent = option.id;

    const optionTextSpan = document.createElement('span');
    optionTextSpan.className = 'is-size-6';
    optionTextSpan.textContent = option.text || '';

    leftDiv.appendChild(optionIdSpan);
    leftDiv.appendChild(optionTextSpan);
    textDiv.appendChild(leftDiv);
    content.appendChild(textDiv);

    // 选项图片
    if (option.image) {
        const imgDiv = document.createElement('div');
        imgDiv.className = 'has-text-centered mt-3';

        const img = document.createElement('img');
        img.src = option.image;
        img.className = 'option-image';
        img.alt = `选项${option.id}图片`;

        imgDiv.appendChild(img);
        content.appendChild(imgDiv);
    }

    div.appendChild(content);

    // 点击事件
    div.addEventListener('click', () => selectOption(option.id));

    return div;
}

// 选择选项
function selectOption(optionId) {
    document.querySelectorAll('.option-box').forEach(box => {
        box.classList.remove('is-selected');
    });

    const selectedBox = document.querySelector(`.option-box[data-option-id="${optionId}"]`);
    if (selectedBox) {
        selectedBox.classList.add('is-selected');
        AppState.selectedAnswer = optionId;
        DOM.submitBtn.disabled = false;
    }
}

// 提交答案
function submitAnswer() {
    if (AppState.selectedAnswer === null) {
        alert('请先选择一个答案！');
        return;
    }

    const question = AppState.questions[AppState.currentIndex];
    const isCorrect = AppState.selectedAnswer === question.answer;

    // 更新统计
    AppState.answeredCount++;
    if (isCorrect) AppState.correctCount++;

    saveProgress();
    showResult(question, isCorrect);
    updateStatistics();
}

// 显示结果
function showResult(question, isCorrect) {
    DOM.resultPanel.classList.add('is-active');

    let resultHTML = `
        <div class="notification ${isCorrect ? 'is-success' : 'is-danger'}">
            <div class="level is-mobile">
                <div class="level-left">
                    <div class="level-item">
                        <span class="icon is-large">
                            <i class="fas ${isCorrect ? 'fa-check-circle' : 'fa-times-circle'} fa-2x"></i>
                        </span>
                    </div>
                    <div class="level-item">
                        <div>
                            <p class="title is-5">${isCorrect ? '回答正确！' : '回答错误！'}</p>
                            <p class="subtitle is-6">你的答案：${AppState.selectedAnswer}</p>
                        </div>
                    </div>
                </div>
                <div class="level-right">
                    <div class="level-item">
                        <span class="tag is-medium ${isCorrect ? 'is-success' : 'is-danger'}">
                            ${isCorrect ? '正确' : '错误'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="box">
            <p class="title is-6 mb-3">
                <span class="icon has-text-info"><i class="fas fa-lightbulb"></i></span>
                正确答案：<span class="tag is-success is-medium">${question.answer}</span>
            </p>
    `;

    if (question.explanation) {
        resultHTML += `
            <div class="content mt-4">
                <h4 class="title is-6">题目解析：</h4>
                <p>${question.explanation}</p>
            </div>
        `;
    }

    resultHTML += `</div>`;
    DOM.resultContent.innerHTML = resultHTML;

    // 高亮选项
    highlightOptions(question.answer, AppState.selectedAnswer);
}

// 高亮选项
function highlightOptions(correctAnswer, selectedAnswer) {
    document.querySelectorAll('.option-box').forEach(box => {
        const optionId = box.dataset.optionId;
        box.classList.remove('is-correct', 'is-wrong');

        if (optionId === correctAnswer) {
            box.classList.add('is-correct');
        } else if (optionId === selectedAnswer && optionId !== correctAnswer) {
            box.classList.add('is-wrong');
        }

        box.classList.remove('is-clickable');
        box.style.pointerEvents = 'none';
    });
}

// 更新统计信息
function updateStatistics() {
    const accuracy = AppState.answeredCount > 0
        ? Math.round((AppState.correctCount / AppState.answeredCount) * 100)
        : 0;

    DOM.accuracyRate.textContent = `${accuracy}%`;
    DOM.answeredCount.textContent = AppState.answeredCount;
    DOM.correctCount.textContent = AppState.correctCount;
    DOM.wrongCount.textContent = AppState.answeredCount - AppState.correctCount;
}

// 更新按钮状态
function updateButtonStates() {
    DOM.prevBtn.disabled = AppState.currentIndex === 0;
    DOM.nextBtn.disabled = AppState.currentIndex === AppState.questions.length - 1;
    DOM.submitBtn.disabled = true;
}

// 绑定事件
function bindEvents() {
    DOM.prevBtn.addEventListener('click', () => showQuestion(AppState.currentIndex - 1));
    DOM.nextBtn.addEventListener('click', () => showQuestion(AppState.currentIndex + 1));
    DOM.submitBtn.addEventListener('click', submitAnswer);

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowLeft': if (!DOM.prevBtn.disabled) showQuestion(AppState.currentIndex - 1); break;
            case 'ArrowRight': if (!DOM.nextBtn.disabled) showQuestion(AppState.currentIndex + 1); break;
            case 'Enter': if (!DOM.submitBtn.disabled) submitAnswer(); break;
            // case '1': case '2': case '3': case '4':
            //     const optionId = String.fromCharCode(64 + parseInt(e.key));
            //     selectOption(optionId); break;
            case 'y': selectOption('对'); break;
            case 'n': selectOption('错'); break;
        }
    });
}

// 启动应用
document.addEventListener('DOMContentLoaded', initApp);