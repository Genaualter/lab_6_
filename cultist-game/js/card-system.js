/*
   Система карт и стеков
   Cultist Simulator Zhalkaya Parodia
*/

// Типы карт, которые можно складывать в стеки (теперь все одинаковые карты)
const STACKABLE_TYPES = [
    cardTypes.ASPECT, 
    cardTypes.FOLLOWER, 
    cardTypes.LOCATION
];

// Создание карты (без описания по умолчанию)
function createCard(title, description, type, defaultX, defaultY, value = null, knowledgeType = null) {
    const cardId = 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    let finalX = defaultX;
    let finalY = defaultY;
    
    const saveKey = title + (knowledgeType || '');
    if (gameState.cardPositions[saveKey]) {
        finalX = gameState.cardPositions[saveKey].x;
        finalY = gameState.cardPositions[saveKey].y;
    }
    
    const card = {
        id: cardId,
        title,
        description,
        type,
        x: finalX,
        y: finalY,
        value: value,
        stackId: null, // ID стека, если карта в стеке (бывший groupId)
        stackIndex: 0,  // Позиция в стеке
        knowledgeType: knowledgeType // Для карт аспектов
    };
    
    gameState.cards.push(card);
    
    // Если это аспект, добавляем в отслеживание
    if (type === cardTypes.ASPECT && knowledgeType) {
        gameState.obtainedKnowledge.add(knowledgeType);
    }
    
    // Сохраняем карты в localStorage
    localStorage.setItem('cultGameCards', JSON.stringify(gameState.cards));
    
    return card;
}

// Функция для добавления карты в стек (ранее groupCards)
function addToStack(card, targetCardOrStack) {
    // Проверяем, можно ли складывать эти карты
    if (!STACKABLE_TYPES.includes(card.type)) {
        return false;
    }
    
    // Определяем целевой стек
    let targetStack = null;
    let targetStackId = null;
    
    if (targetCardOrStack.stackId) {
        // Цель уже в стеке
        targetStackId = targetCardOrStack.stackId;
        targetStack = gameState.cardStacks[targetStackId];
    } else if (targetCardOrStack.id && targetCardOrStack.id.startsWith('stack_')) {
        // Цель - стек (передан объект стека)
        targetStackId = targetCardOrStack.id;
        targetStack = gameState.cardStacks[targetStackId];
    } else {
        // Цель - одиночная карта
        // Проверяем совместимость карт
        if (!areCardsStackable(card, targetCardOrStack)) {
            return false;
        }
        
        // Создаем новый стек из двух карт
        targetStackId = 'stack_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        targetStack = {
            id: targetStackId,
            type: card.type,
            cardTitle: card.title,
            knowledgeType: card.knowledgeType,
            cards: [targetCardOrStack.id, card.id],
            x: targetCardOrStack.x,
            y: targetCardOrStack.y
        };
        
        gameState.cardStacks[targetStackId] = targetStack;
        targetCardOrStack.stackId = targetStackId;
        targetCardOrStack.stackIndex = 0;
    }
    
    // Проверяем, можно ли добавить карту в этот стек
    if (!canAddToStack(card, targetStack)) {
        return false;
    }
    
    // Добавляем карту в стек
    card.stackId = targetStackId;
    card.stackIndex = targetStack.cards.length;
    card.x = targetStack.x;
    card.y = targetStack.y;
    targetStack.cards.push(card.id);
    
    const cardName = card.type === cardTypes.ASPECT ? 
        KNOWLEDGE_TYPES[card.knowledgeType].name : card.title;
    addLogEntry(`Карта "${cardName}" добавлена в стек.`);
    updateUI();
    return true;
}

// Проверка, можно ли сложить две карты вместе
function areCardsStackable(card1, card2) {
    if (card1.type !== card2.type) return false;
    
    if (card1.type === cardTypes.ASPECT) {
        return card1.knowledgeType === card2.knowledgeType;
    } else {
        return card1.title === card2.title;
    }
}

// Проверка, можно ли добавить карту в существующий стек
function canAddToStack(card, stack) {
    if (card.type !== stack.type) return false;
    
    if (card.type === cardTypes.ASPECT) {
        return card.knowledgeType === stack.knowledgeType;
    } else {
        return card.title === stack.cardTitle;
    }
}

// Функция для удаления карты из стека
function removeFromStack(card) {
    if (!card.stackId) return;
    
    const stack = gameState.cardStacks[card.stackId];
    if (!stack) return;
    
    const index = stack.cards.indexOf(card.id);
    if (index > -1) {
        stack.cards.splice(index, 1);
        
        // Сдвигаем позицию карты немного, чтобы она была видна
        card.x = stack.x + (index * 15);
        card.y = stack.y + (index * 15);
        card.stackId = null;
        card.stackIndex = 0;
        
        const cardName = card.type === cardTypes.ASPECT ? 
            KNOWLEDGE_TYPES[card.knowledgeType].name : card.title;
        addLogEntry(`Карта "${cardName}" удалена из стека.`);
        
        // Если в стеке осталась одна карта, удаляем стек
        if (stack.cards.length <= 1) {
            if (stack.cards.length === 1) {
                const lastCard = gameState.cards.find(c => c.id === stack.cards[0]);
                if (lastCard) {
                    lastCard.stackId = null;
                    lastCard.stackIndex = 0;
                    // Возвращаем карту на позицию стека
                    lastCard.x = stack.x;
                    lastCard.y = stack.y;
                }
            }
            delete gameState.cardStacks[card.stackId];
        }
    }
    
    updateUI();
}

// Функция для разборки всего стека
function unstackAll(stackId) {
    const stack = gameState.cardStacks[stackId];
    if (!stack) return;
    
    stack.cards.forEach((cardId, index) => {
        const card = gameState.cards.find(c => c.id === cardId);
        if (card) {
            card.stackId = null;
            card.stackIndex = 0;
            // Располагаем карты веером
            card.x = stack.x + (index * 25);
            card.y = stack.y + (index * 25);
        }
    });
    
    delete gameState.cardStacks[stackId];
    addLogEntry(`Стек разобран.`);
    updateUI();
}

// Функция для автоматического создания стеков
function autoGroupAllCards() {
    let stacksCreated = 0;
    let cardsStacked = 0;
    
    // Собираем карты по полной идентичности
    const cardsByIdentity = {};
    
    gameState.cards.forEach(card => {
        if (STACKABLE_TYPES.includes(card.type) && !card.stackId) {
            let key;
            if (card.type === cardTypes.ASPECT) {
                key = `aspect_${card.knowledgeType}`;
            } else {
                key = `${card.type}_${card.title}`;
            }
            
            if (!cardsByIdentity[key]) {
                cardsByIdentity[key] = {
                    type: card.type,
                    cards: [],
                    knowledgeType: card.knowledgeType,
                    title: card.title
                };
            }
            cardsByIdentity[key].cards.push(card);
        }
    });
    
    // Создаем стеки из одинаковых карт
    Object.values(cardsByIdentity).forEach(stackData => {
        const cards = stackData.cards;
        
        // Создаем стеки минимум из 2 карт
        while (cards.length >= 2) {
            const card1 = cards.shift();
            const card2 = cards.shift();
            
            if (card1 && card2) {
                // Создаем стек
                const stackId = 'auto_stack_' + Date.now() + '_' + stacksCreated;
                const stack = {
                    id: stackId,
                    type: stackData.type,
                    cardTitle: stackData.title,
                    knowledgeType: stackData.knowledgeType,
                    cards: [card1.id, card2.id],
                    x: card1.x,
                    y: card1.y
                };
                
                gameState.cardStacks[stackId] = stack;
                
                card1.stackId = stackId;
                card1.stackIndex = 0;
                card2.stackId = stackId;
                card2.stackIndex = 1;
                card2.x = card1.x;
                card2.y = card1.y;
                
                stacksCreated++;
                cardsStacked += 2;
                
                // Добавляем остальные карты в этот же стек
                while (cards.length > 0) {
                    const nextCard = cards.shift();
                    if (nextCard) {
                        nextCard.stackId = stackId;
                        nextCard.stackIndex = stack.cards.length;
                        nextCard.x = card1.x;
                        nextCard.y = card1.y;
                        stack.cards.push(nextCard.id);
                        cardsStacked++;
                    }
                }
            }
        }
    });
    
    if (cardsStacked > 0) {
        addLogEntry(`Автоматически создано ${stacksCreated} стеков из ${cardsStacked} карт.`);
        updateUI();
    } else {
        addLogEntry(`Нет карт для автоматического создания стеков.`);
    }
    
    // ВАЖНО: НЕ проверяем концовки здесь - только обновляем UI
    // Концовки должны проверяться только при проведении ритуала
    updateUI(); // Еще раз обновляем UI
}

// Инициализация перетаскивания карт (без ограничений поля)
function initCardDrag() {
    let draggedCard = null;
    let draggedStack = null;
    let offsetX, offsetY;
    let originalX, originalY;
    let dragStartTime = 0;
    let isDoubleClick = false;
    
    document.addEventListener('mousedown', e => {
        if (e.target.closest('.card') && !e.target.closest('.stack-controls')) {
            const cardElement = e.target.closest('.card');
            const stackId = cardElement.getAttribute('data-stack-id');
            
            // Проверяем двойной клик
            const currentTime = Date.now();
            if (currentTime - dragStartTime < 300) {
                isDoubleClick = true;
            }
            dragStartTime = currentTime;
            
            if (stackId) {
                // Перетаскиваем стек
                draggedStack = stackId;
            } else {
                // Перетаскиваем карту
                draggedCard = cardElement;
            }
            
            offsetX = e.clientX - cardElement.offsetLeft;
            offsetY = e.clientY - cardElement.offsetTop;
            originalX = cardElement.offsetLeft;
            originalY = cardElement.offsetTop;
            
            cardElement.style.zIndex = '1000';
            
            // Показываем описание карты при одинарном клике
            setTimeout(() => {
                if (!isDoubleClick && (draggedCard === cardElement || draggedStack === stackId)) {
                    showCardDescription(cardElement);
                }
            }, 200);
        }
    });
    
    document.addEventListener('mousemove', e => {
        if (draggedCard || draggedStack) {
            const element = draggedCard || document.querySelector(`.stack[data-stack-id="${draggedStack}"]`);
            if (element) {
                element.style.left = `${e.clientX - offsetX}px`;
                element.style.top = `${e.clientY - offsetY}px`;
                
                // Подсвечиваем возможные стеки для добавления
                highlightPotentialStacks(e.clientX, e.clientY, element);
            }
        }
    });
    
    document.addEventListener('mouseup', (e) => {
        isDoubleClick = false;
        
        if (draggedCard) {
            handleCardDrop(draggedCard, e);
            draggedCard = null;
        } else if (draggedStack) {
            handleStackDrop(draggedStack, e);
            draggedStack = null;
        }
        
        clearHighlights();
    });
    
    // Обработчик клавиши Tab для автоматического создания стеков
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && !e.target.matches('input, textarea, select, button')) {
            e.preventDefault();
            autoGroupAllCards();
        }
    });
    
    function handleCardDrop(draggedElement, e) {
        const cardId = draggedElement.getAttribute('data-id');
        const cardTitle = draggedElement.getAttribute('data-title');
        const knowledgeType = draggedElement.getAttribute('data-knowledge-type');
        
        if (cardId) {
            const card = gameState.cards.find(c => c.id == cardId);
            if (card) {
                const newX = parseInt(draggedElement.style.left);
                const newY = parseInt(draggedElement.style.top);
                
                // Проверяем, не бросили ли карту на другую карту или стек
                const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
                const targetCard = elementBelow?.closest('.card');
                
                if (targetCard && targetCard !== draggedElement) {
                    const targetCardId = targetCard.getAttribute('data-id');
                    const targetStackId = targetCard.getAttribute('data-stack-id');
                    
                    if (targetCardId) {
                        // Бросили на одиночную карту
                        const targetCardObj = gameState.cards.find(c => c.id == targetCardId);
                        if (targetCardObj && areCardsStackable(card, targetCardObj)) {
                            if (addToStack(card, targetCardObj)) {
                                draggedElement.style.zIndex = '';
                                clearHighlights();
                                return;
                            }
                        }
                    } else if (targetStackId) {
                        // Бросили на стек
                        const stack = gameState.cardStacks[targetStackId];
                        if (stack && canAddToStack(card, stack)) {
                            // Добавляем карту в стек
                            card.stackId = targetStackId;
                            card.stackIndex = stack.cards.length;
                            card.x = stack.x;
                            card.y = stack.y;
                            stack.cards.push(card.id);
                            
                            const cardName = card.type === cardTypes.ASPECT ? 
                                KNOWLEDGE_TYPES[card.knowledgeType].name : card.title;
                            addLogEntry(`Карта "${cardName}" добавлена в существующий стек.`);
                            updateUI();
                            
                            draggedElement.style.zIndex = '';
                            clearHighlights();
                            return;
                        }
                    }
                }
                
                // Если добавления в стек не было, обновляем позицию
                card.x = newX;
                card.y = newY;
                
                // Карты можно выносить за пределы стола - никаких ограничений
                const saveKey = cardTitle + (knowledgeType || '');
                gameState.cardPositions[saveKey] = { 
                    x: card.x, 
                    y: card.y 
                };
                localStorage.setItem('cultGameCardPositions', JSON.stringify(gameState.cardPositions));
            }
        }
        
        draggedElement.style.zIndex = '';
    }
    
    function handleStackDrop(stackId, e) {
        const stack = gameState.cardStacks[stackId];
        if (stack) {
            const stackElement = document.querySelector(`.stack[data-stack-id="${stackId}"]`);
            const newX = parseInt(stackElement.style.left);
            const newY = parseInt(stackElement.style.top);
            
            stack.x = newX;
            stack.y = newY;
            
            // Обновляем позиции всех карт в стеке
            stack.cards.forEach(cardId => {
                const card = gameState.cards.find(c => c.id === cardId);
                if (card) {
                    card.x = stack.x;
                    card.y = stack.y;
                }
            });
            
            const saveKey = `stack_${stackId}`;
            gameState.cardPositions[saveKey] = { 
                x: stack.x, 
                y: stack.y 
            };
            localStorage.setItem('cultGameCardPositions', JSON.stringify(gameState.cardPositions));
        }
        
        const stackElement = document.querySelector(`.stack[data-stack-id="${stackId}"]`);
        if (stackElement) {
            stackElement.style.zIndex = '';
        }
    }
    
    // Подсветка потенциальных стеков для добавления
    function highlightPotentialStacks(x, y, draggedElement) {
        const draggedCardId = draggedElement.getAttribute('data-id');
        if (!draggedCardId) return;
        
        const card = gameState.cards.find(c => c.id == draggedCardId);
        if (!card) return;
        
        // Снимаем все подсветки
        clearHighlights();
        
        // Находим все элементы под курсором
        const elements = document.elementsFromPoint(x, y);
        
        elements.forEach(element => {
            if (element.classList.contains('card') && element !== draggedElement) {
                const targetCardId = element.getAttribute('data-id');
                const targetStackId = element.getAttribute('data-stack-id');
                
                if (targetCardId) {
                    const targetCard = gameState.cards.find(c => c.id == targetCardId);
                    if (targetCard && areCardsStackable(card, targetCard)) {
                        element.classList.add('can-stack');
                    }
                } else if (targetStackId) {
                    const stack = gameState.cardStacks[targetStackId];
                    if (stack && canAddToStack(card, stack)) {
                        element.classList.add('can-stack');
                    }
                }
            }
        });
    }
    
    function clearHighlights() {
        document.querySelectorAll('.can-stack').forEach(el => {
            el.classList.remove('can-stack');
        });
    }
}

// Показать описание карты
function showCardDescription(cardElement) {
    const cardId = cardElement.getAttribute('data-id');
    const stackId = cardElement.getAttribute('data-stack-id');
    
    let card = null;
    
    if (cardId) {
        card = gameState.cards.find(c => c.id == cardId);
    } else if (stackId) {
        const stack = gameState.cardStacks[stackId];
        if (stack && stack.cards.length > 0) {
            const firstCardId = stack.cards[0];
            card = gameState.cards.find(c => c.id === firstCardId);
        }
    }
    
    if (card) {
        const description = getCardDescription(card);
        const descriptionPanel = document.getElementById('card-description-panel');
        const descriptionText = document.getElementById('card-description-text');
        
        if (description && descriptionPanel && descriptionText) {
            descriptionText.innerHTML = description;
            descriptionPanel.style.display = 'block';
            
            // Скрываем описание через 5 секунд
            setTimeout(() => {
                descriptionPanel.style.display = 'none';
            }, 5000);
        }
    }
}