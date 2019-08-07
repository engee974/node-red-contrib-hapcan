module.exports = function (RED) {

    function ThermostatInputNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        node.gateway = RED.nodes.getNode(config.gateway);
        node.group = config.group;
        node.node = config.node;
        node.name = config.name;

        node.hapcanId = ("00" + node.node).slice(-3) + ("00" + node.group).slice(-3) + '_';

        this.status({ fill: "grey", shape: "dot", text: "not registered to gateway" });

        if (node.gateway) {
            node.gateway.register(node);
        }
        else {
            node.error('Invalid configuration. Gateway is required.');
        }

        this.on('close', function (done) {
            if (node.gateway) {
                node.gateway.deregister(node, done);
            }
        });

        node.gateway.eventEmitter.on('messageReceived_304', function (data) {

            var hapcanMessage = data.payload;

            if (hapcanMessage.node != node.node || hapcanMessage.group != node.group)
                return;

            hapcanMessage.type = hapcanMessage.frame[7];

            if (hapcanMessage.type != 0x12)
                return;

            switch (hapcanMessage.frame[8]) {
                case 0x00:
                    hapcanMessage.position = 'BELOW';
                    break;
                case 0x80:
                    hapcanMessage.position = 'POWERUP';
                    break;
                case 0xFF:
                    hapcanMessage.position = 'ABOVE';
                    break;
            }

            switch (hapcanMessage.frame[9]) {
                case 0xFF:
                    hapcanMessage.enabled = true;
                    break;
                case 0x00:
                    hapcanMessage.enabled = false;
                    break;
            }

            node.send({ topic: 'Thermostat message', payload: hapcanMessage });
        });

        this.on('close', function () {
            // tidy up any state
        });

    }
    RED.nodes.registerType("thermostat-input", ThermostatInputNode);
}