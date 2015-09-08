var view = {
    displayMessage: function (msg) {
        var messageArea = document.getElementById('messageArea');
        messageArea.innerHTML = msg;
        $('#messageArea').css('display', 'inline');
    },
    displayHit: function (location) {
        $('#' + location).attr('class', 'hit');
    },
    displayMiss: function (location) {
        $('#' + location).attr('class', 'miss');
    },
    displayStatistics: function () {
        var stat = 'Игровая статистика:<br><br>';
        stat += 'Всего кораблей на поле: ' + model.fullNumShips() + '<br>';
        stat += 'Из них:<br>однопалубных - ' + model.numShips[0] + '<br>';
        stat += 'двухпалубных - ' + model.numShips[1] + '<br>';
        stat += 'трехпалубных - ' + model.numShips[2] + '<br>';
        stat += 'четырехпалубных - ' + model.numShips[3] + '<br><br>';
        stat += 'Выстрелов произведено: '+ controller.guesses + '<br>';
        stat += 'Кораблей уничтожено: '+ model.shipsSunk;
        var statBlck = document.getElementById('statBlock');
        statBlck.innerHTML = stat;
    }
};

var model = {
    boardSize: 10, /* размер поля */
    numShips: [4, 3, 2, 1], /* количество кораблей каждого размера */
    shipLength: [4, 3, 2, 1], /* соответствующие размеры кораблей */
    shipsSunk: 0, /* счетчик потопленных судов  */
    collisionCounter: 0, /* счетчик отвергнутых вариантов расположения, нужен для отсечения бесконечного цикла  */
    alphabet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'], /* алфавит для указания координат */
    collisionMatrix: [], /* матрица доступных к расположению корабля вариантов: 0 - свободно, 1 - корабль или его окресности  */
    ships: [], /* массив всех кораблей эскадры */

    initializeCollisionMatrix: function () { /* создание пустой матрицы колизий по размеру игрового поля */
        for (var i = 0; i < this.boardSize; i++) {
            var arr = [];
            for (var j = 0; j < this.boardSize; j++) {
                arr.push(0);
            };
            this.collisionMatrix.push(arr);
        };
    },

    fullNumShips: function () { /* вычисление общего количества кораблей в эскадре */
        var full = 0;
        for (var i = 0; i < 4; i++) {
            full += this.numShips[i];
        };
        return full;
    },

    fire: function (guess) { /* функция обработки выстрела  */
        if (this.ships.length > 0) { /* если корабли расположить не удалось, то массив кораблей пуст и стрелять не по чему */
            for (var i = 0; i < this.fullNumShips(); i++) {
                var ship = this.ships[i];
                var locations = ship.locations;
                var index = locations.indexOf(guess);
                if (index >= 0) {
                    ship.hits[index] = 'hit';
                    view.displayHit(guess);
                    view.displayMessage('Попадание! Корабль ранен.');
                    if (this.isSunk(ship)) {
                        this.shipsSunk++;
                        view.displayMessage('Вы уничтожили один из боевых кораблей!');
                    };
                    return true;
                }
            } 
        };
        view.displayMiss(guess);
        view.displayMessage('Промах.');
        return false;
    },

    isSunk: function (ship) { /* проверка, был ли уничтожен корабль текущим попаданием */
        for (var i = 0; i < ship.locations.length; i++) {
            if (ship.hits[i] !== 'hit') {
                return false;
            }
        };
        return true;
    },

    generateShip: function (shipLnth) { /* генерация координат корабля по заданной длине */
        var direction = Math.floor(Math.random() * 2);
        var raw, col;
        var newShipLocations = [];
        if (direction === 1) { /* gorizontal */
            raw = Math.floor(Math.random() * (this.boardSize - shipLnth));
            col = Math.floor(Math.random() * this.boardSize);
            newShipLocations[0] = raw + '' + col;
        } else { /* vertical */
            raw = Math.floor(Math.random() * this.boardSize);
            col = Math.floor(Math.random() * (this.boardSize - shipLnth));
            newShipLocations[0] = raw + '' + col;
        };
        for (var i = 1; i < shipLnth; i++) {
            if (direction === 1) {
                newShipLocations[i] = (raw + i) + '' + col;
            } else {
                newShipLocations[i] = raw + '' + (col + i);
            }
        };
        return newShipLocations;
    },

    generateShipLocations: function () { /* расставляем корабли по полю */
        this.initializeCollisionMatrix(); /* создаем чистую матрицу пересечений */
        var locations;
        for (var n = 0; n < this.numShips.length; n++) { /* по количеству типов кораблей */
            if (this.numShips[n] != 0) { /* если такие корабли присутствуют в наборе */
                for (var i = 0; i < this.numShips[n]; i++) {
                    do {
                        locations = this.generateShip(n + 1); /* создать массив координат нового корабля */
                        if (this.collisionCounter > 256) { /* проверить, не висим ли в бесконечном цикле, есди да - обнуляем данные и выходим */
                            alert('Невозможно сгенерировать указанное количество кораблей для заданного размера поля!');
                            this.ships = [];
                            this.numShips = [0, 0, 0, 0];
                            this.collisionCounter = 0;
                            return false;
                        }
                    } while (this.collision(locations)); /* повторять, пока не будет найдем разрешенный вариант */
                    this.fillCollisionMatrix(locations); /* внести данные по новому кораблю в матрицу пересечений */
                    var newShip = { locations: [], hits: [] }; /* создать шаблон нового корабля */
                    newShip.locations = locations; /* передать ему координаты */
                    this.ships.push(newShip); /* внести корабль в массив эскадры */
                }
            };
        };
    },

    collision: function (locations) { /* проверка доступности расположения нового корабля по заданным координатам */
        for (var i = 0; i < locations.length; i++) {
            if (this.collisionMatrix[parseInt(locations[i].charAt(0))][parseInt(locations[i].charAt(1))]) {
                this.collisionCounter++; /* увеличить счетчик попыток расположения в недоступном месте */
                return true;
            }
        };
        return false;
    },

    fillCollisionMatrix: function (locations) { /* внесение данных по кораблю в матрицу пересечений */
        var first = parseInt(locations[0].charAt(0));
        var second = parseInt(locations[0].charAt(1));
        for (var i = (first - 1); i < (first + 2); i++) { /* вносим квадрат 3*3 для первой координаты */
            for (var j = (second - 1); j < (second + 2); j++) {
                if ((i >= 0) && (i < this.boardSize) && (j >= 0) && (j < this.boardSize)) {
                    this.collisionMatrix[i][j] = 1;
                }
            }
        };
        for (i = 1; i < locations.length; i++) { /* для остальных добавляем участки 1*3 клетки, не перекрытые предыдущими координатами корабля */
            first = parseInt(locations[i].charAt(0));
            second = parseInt(locations[i].charAt(1));
            if (locations[i - 1].charAt(0) !== locations[i].charAt(0)) {
                for (j = (second - 1); j < (second + 2); j++) {
                    if (((first + 1) >= 0) && ((first + 1) < this.boardSize) && (j >= 0) && (j < this.boardSize)) {
                        this.collisionMatrix[first + 1][j] = 1;
                    }
                }
            } else {
                for (j = (first - 1); j < (first + 2); j++) {
                    if (((second + 1) >= 0) && ((second + 1) < this.boardSize) && (j >= 0) && (j < this.boardSize)) {
                        this.collisionMatrix[j][second + 1] = 1;
                    }
                }
            }
        };
    },

    generateGrid: function (gridSize) { /* генерация таблицы сетки на странице */
        $('#gridTable').empty();
        for (var i = 0; i < gridSize; i++) {
            var row = '<tr>';
            for (var n = 0; n < gridSize; n++) {
                row += '<td id=' + (i + '' + n) + '></td>';
            }
            row += '</tr>';
            $('#gridTable').append(row);
        };
    }

};

var controller = {
    guesses: 0, /* количество выстрелов */    

    parseGuess: function (guess) { /* обработка введенных координат для выстрела через форму */
        if (guess === null || guess.length !== 2) {
            alert('Ooops, please enter a valid coordinate!');
        } else {
            firstChar = guess.charAt(0);
            var row = model.alphabet.indexOf(firstChar);
            var column = guess.charAt(1);
            if (isNaN(row) || isNaN(column)) {
                alert('Ooops, that isnt on the board');
            } else if (row < 0 || row >= model.boardSize || column < 0 || column >= model.boardSize) {
                alert('Ooops, coordinates out of board');
            } else {
                return row + column;
            }
        }
        return null;
    },

    processGuess: function (guess) {
        var location = this.parseGuess(guess);
        if (location) {
            var hit = model.fire(location);
            this.guesses++;
            if (hit && model.shipsSunk === model.fullNumShips()) {
                view.displayMessage("Вы уничтожили все бовые корабли потратив " + this.guesses + " выстрелов.");
            }
        }
    }
};

jQuery(function ($) { /* функция инициализации приложения */
    handleGenerator(); /* обработка генератора */
    $('#fireButton').click(handleFireButton); /* указываем обработчик для кнопки формы выстрела */
    //$('#guessInput').bind('keypress', handleKeyPressed); 
    $('#genButton').click(handleGenerator); /* указываем обработчик для кнопки формы генерации */
    $("table").delegate("td", "click", function () { /* навешиваем обработчик на ячейки таблицы для обработки кликов по ним */
        controller.processGuess(model.alphabet[this.id[0]] + this.id[1]);
        view.displayStatistics();
    });
});

function handleFireButton() {
	controller.processGuess($('#guessInput').val().toUpperCase());
	$('#guessInput').val() = '';
	view.displayStatistics();
};

/*
function handleKeyPressed(key) {
	if (key.keyCode === 13) {
		$('#fireButton').click();
		return false;
	}
} */

function handleGenerator() {    
    model.shipsSunk = 0; /* обнуляем переменные для реинициализации */
    model.collisionCounter = 0;
    controller.guesses = 0;
    model.ships = [];
    model.collisionMatrix = [];
    for (var i = 0; i < 4; i++) { /* читаем данные по количеству кораблей набора и записываем в массив */
        var id = '#ship' + i;
        var value = parseInt($(id).val());
        if (isNaN(value)||(value < 0)||(value > (4 - i))) {
            value = 4 - i;
            var msg = 'Недопустимое значение для количества кораблей с ' + (i + 1) + ' палубами. Сброшено на значение по умолчанию.';
            alert(msg);
        };
        model.numShips[i] = value;
    };
    var bSize = parseInt($("#boardSize").val()); /* получаем размерность игрового поля */
    if (isNaN(bSize)||(bSize < 5)||(bSize > 10)) {
            bSize = 10;
            alert('Недопустимое значение для размера сетки игрового поля. Сброшено на значение по умолчанию.');
        };
    model.boardSize = bSize;
    model.generateGrid(bSize);   /* создаем сетку на странице */ 
    model.generateShipLocations(); /* размещаем корабли на поле */
    view.displayStatistics(); /* выводим игровую статистику */
};