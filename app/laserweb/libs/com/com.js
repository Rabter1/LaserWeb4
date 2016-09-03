;(function(lw) {

    /**
    * Communication library.
    *
    * Description...
    */
    var com = {

        // Library version
        version: '0.0.1',

        // Available interfaces
        interfaces: ['Serial', 'HTTP']

    };

    /**
    * Communication over HTTP library.
    *
    * Description...
    */
    com.http = {

        // Library version
        version: '0.0.1',

        // Return the 'Server' header (footprint)
        get_server_footprint: function(done) {
            var request = new XMLHttpRequest();

            request.onreadystatechange = function() {
                if (this.readyState === 4) {
                    // Get response headers as text (trim witespaces)
                    var raw_headers = this.getAllResponseHeaders().trim();

                    // Split on new lines
                    var headers_lines = raw_headers.split('\n');

                    // Headers pair
                    var header, headers = {};

                    // For each line (header pair)
                    for (var i = 0, il = headers_lines.length; i < il; i++) {
                        // Split current line on ':' char
                        header = headers_lines[i].split(':');
                        // Assign to headers pair list
                        headers[header[0].trim()] = header[1].trim();
                    }

                    // Get the 'Server' header as footprint
                    var footprint = headers['Server'] || 'Unknown Server';

                    // Call user callback
                    done(footprint, headers);
                }
            };

            // Send HEAD request on current page url
            request.open('HEAD', document.location, true);
            request.send(null);
        }

    };

    /**
    * Communication over socket library.
    *
    * Description...
    */
    com.socket = {
        // Socket
        io: null,

        // IO connection
        connect: function() {
            if (this.io) {
                return this.io;
            }

            this.io = io.connect(document.location.toString(), {
                path: '/vendor/socket.io'
            });
        }
    };

    /**
    * Communication over serial library.
    *
    * Description...
    */
    com.serial = {

        // Library version
        version: '0.0.1',

        // Selected baud rate
        baud_rate: 115200,

        // Available baud rates
        baud_rates: [250000, 230400, 115200, 57600, 38400, 19200, 9600],

        // Pub/Sub...
        emit: function(message, data) {
            com.socket.io.emit('serial.' + message, data || null);
        },

        on: function(message, callback) {
            com.socket.io.on('serial.' + message, callback);
        },

        command: function(name, args) {
            this.emit('command', {
                name: name,
                args: args
            });
        },

        on_command: function(callback) {
            this.on('command', callback);
        }
    };

    /**
    * Exports library
    * @type {[type]}
    */
    lw.libs.com = com;

})(laserweb);