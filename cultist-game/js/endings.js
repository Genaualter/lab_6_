/*
   Система концовок
   Cultist Simulator Zhalkaya Parodia
*/

// Выполнение ритуала
function performRitual() {
    // Получаем аспекты (только карты аспектов, не стеки)
    const aspectCards = gameState.cards.filter(card => 
        card.type === cardTypes.ASPECT && card.knowledgeType
    );
    
    // Проверяем концовки по аспектам (вознесение через аспекты)
    for (const [aspectType, aspectInfo] of Object.entries(KNOWLEDGE_TYPES)) {
        // Считаем карты этого аспекта (учитывая карты в стеках)
        let aspectCount = 0;
        
        // Считаем одиночные карты
        aspectCards.forEach(card => {
            if (card.knowledgeType === aspectType) {
                aspectCount++;
            }
        });
        
        // Считаем карты в стеках
        Object.values(gameState.cardStacks).forEach(stack => {
            if (stack.type === cardTypes.ASPECT && stack.knowledgeType === aspectType) {
                aspectCount += stack.cards.length;
            }
        });
        
        // Для вознесения нужно 3 карты одного аспекта И культ этого аспекта
        if (aspectCount >= 3 && gameState.cultCreated && gameState.cultAspect === aspectType) {
            const endingKey = `${aspectType}_ENDING`;
            if (endings[endingKey]) {
                return {
                    message: `Вы проводите Великий Ритуал Вознесения через ${aspectInfo.name}!`,
                    ending: endings[endingKey]
                };
            }
        }
    }
    
    // Проверяем другие условия для ритуалов (если есть культ)
    if (gameState.cultCreated) {
        const followerCards = gameState.cards.filter(card => card.type === cardTypes.FOLLOWER);
        const locationCards = gameState.cards.filter(card => card.type === cardTypes.LOCATION);
        
        // Считаем верных последователей (учитывая стеки)
        let faithfulCount = 0;
        followerCards.forEach(card => {
            if (card.title.includes('Верный')) {
                faithfulCount++;
            }
        });
        
        // Также учитываем последователей в стеках
        Object.values(gameState.cardStacks).forEach(stack => {
            if (stack.type === cardTypes.FOLLOWER) {
                stack.cards.forEach(cardId => {
                    const card = gameState.cards.find(c => c.id === cardId);
                    if (card && card.title.includes('Верный')) {
                        faithfulCount++;
                    }
                });
            }
        });
        
        // Концовка лидера культа - 5+ верных последователей
        if (faithfulCount >= 5) {
            return {
                message: 'Ваш культ стал могущественной организацией!',
                ending: endings.CULT_LEADER
            };
        }
        
        // Концовка забвения - 3+ мест
        let locationCount = locationCards.length;
        Object.values(gameState.cardStacks).forEach(stack => {
            if (stack.type === cardTypes.LOCATION) {
                locationCount += stack.cards.length;
            }
        });
        
        if (locationCount >= 3) {
            return {
                message: 'Вы теряетесь в лабиринте забытых мест...',
                ending: endings.FORGOTTEN
            };
        }
    }
    
    return null;
}

// Проверка условий концовок
function checkEndings() {
    // 1. Концовка безумия (только когда рассудок <= 0)
    if (gameState.reason <= 0) {
        showEnding(endings.MADNESS);
        return;
    }
    
    // 2. Концовка забвения (низкое здоровье) - проверяем только <= 0
    if (gameState.health <= 0) {
        showEnding(endings.FORGOTTEN);
        return;
    }
    
    // 3. УБРАНА: концовка безумия при 5+ разных аспектах без культа
    // Теперь это не вызывает безумие
    
    // 4. Проверка концовок по аспектам (если есть культ)
    // ВАЖНО: Концовки по аспектам проверяются ТОЛЬКО в performRitual()
    // Не проверяем их здесь, чтобы не вызывать автоматически
}

// Обновление счетчика концовок
function updateEndingsCounter() {
    let availableEndings = 1; // Безумие всегда доступно (через рассудок 0)
    
    // Проверяем условия для каждой концовки
    
    // Забвение (здоровье ≤ 0) - всегда потенциально доступно
    if (gameState.health <= 2) {
        // Здоровье близко к 0
        availableEndings++;
    }
    
    // Концовки по аспектам (требуют культа)
    if (gameState.cultCreated && gameState.cultAspect) {
        const cultAspectType = gameState.cultAspect;
        
        // Считаем карты аспекта культа
        let aspectCount = 0;
        const aspectCards = gameState.cards.filter(card => 
            card.type === cardTypes.ASPECT && card.knowledgeType === cultAspectType
        );
        
        aspectCount += aspectCards.length;
        
        // Считаем карты в стеках
        Object.values(gameState.cardStacks).forEach(stack => {
            if (stack.type === cardTypes.ASPECT && stack.knowledgeType === cultAspectType) {
                aspectCount += stack.cards.length;
            }
        });
        
        // Если есть 2 карты аспекта, 3-я близка
        if (aspectCount >= 2) {
            availableEndings++;
        }
    }
    
    // Концовка лидера культа (верные последователи)
    if (gameState.cultCreated) {
        let faithfulCount = 0;
        const followerCards = gameState.cards.filter(card => card.type === cardTypes.FOLLOWER);
        
        followerCards.forEach(card => {
            if (card.title.includes('Верный')) {
                faithfulCount++;
            }
        });
        
        // Также учитываем последователей в стеках
        Object.values(gameState.cardStacks).forEach(stack => {
            if (stack.type === cardTypes.FOLLOWER) {
                // Нужно проверить каждую карту в стеке
                stack.cards.forEach(cardId => {
                    const card = gameState.cards.find(c => c.id === cardId);
                    if (card && card.title.includes('Верный')) {
                        faithfulCount++;
                    }
                });
            }
        });
        
        if (faithfulCount >= 3) { // Если есть 3+ верных, 5 близко
            availableEndings++;
        }
    }
    
    // Концовка клерка (последовательные работы)
    if (gameState.consecutiveWork >= 7) { // Если 7+ работ подряд, 9 близко
        availableEndings++;
    }
    
    // Концовка забвения через места
    let locationCount = gameState.cards.filter(card => card.type === cardTypes.LOCATION).length;
    Object.values(gameState.cardStacks).forEach(stack => {
        if (stack.type === cardTypes.LOCATION) {
            locationCount += stack.cards.length;
        }
    });
    
    if (locationCount >= 2) { // Если есть 2 места, 3-е близко
        availableEndings++;
    }
    
    // Обновляем счетчик в интерфейсе
    const endingsCountElement = document.getElementById('endings-count');
    if (endingsCountElement) {
        endingsCountElement.textContent = availableEndings;
    }
}

// Показать экран концовки
function showEnding(ending) {
    // Сохраняем статистику игры перед показом концовки
    const gameStats = {
        totalCards: gameState.cards.length,
        totalStacks: Object.keys(gameState.cardStacks).length,
        aspectsFound: gameState.obtainedKnowledge.size,
        consecutiveWork: gameState.consecutiveWork || 0,
        workCount: gameState.workCount || 0,
        ritualCount: gameState.ritualCount || 0,
        cultCreated: gameState.cultCreated,
        cultAspect: gameState.cultAspect
    };
    
    // Добавляем статистику к описанию концовки
    let description = ending.description;
    description += `<br><br><div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(212, 175, 55, 0.3); font-size: 0.9rem; color: #b0a36a;">`;
    description += `<strong>Статистика игры:</strong><br>`;
    description += `- Всего карт: ${gameStats.totalCards}<br>`;
    description += `- Всего стеков: ${gameStats.totalStacks}<br>`;
    description += `- Найдено аспектов: ${gameStats.aspectsFound}/9<br>`;
    description += `- Выполнено работ: ${gameStats.workCount}<br>`;
    description += `- Проведено ритуалов: ${gameStats.ritualCount}<br>`;
    
    if (gameStats.cultCreated && gameStats.cultAspect) {
        const aspectName = KNOWLEDGE_TYPES[gameStats.cultAspect]?.name || gameStats.cultAspect;
        description += `- Создан культ: ${aspectName}<br>`;
    }
    
    description += `</div>`;
    
    document.getElementById('ending-title').textContent = ending.title;
    document.getElementById('ending-description').innerHTML = description;
    document.getElementById('ending-modal').style.display = 'flex';
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('controls-hint').style.display = 'none';
    document.getElementById('auto-group-btn').style.display = 'none';
    document.getElementById('card-description-panel').style.display = 'none';
    
    // Скрываем все другие модальные окна
    document.getElementById('cult-choice-modal').style.display = 'none';
    document.getElementById('career-modal').style.display = 'none';
    document.getElementById('explore-modal').style.display = 'none';
}