const db = firebase.firestore();

var dataModel = {
  'KEY': {
    members: {
      'key_m1': {
        name: 'aaa',
        email: 'aaa@aaa.com',
        createdAt: '2019/01/01',
        events: {
          'key_e1': true,
          'key_e2': true,
        }
      },
      'key_m2': {
        name: 'bbb',
        email: 'bbb@bbb.com',
        createdAt: '2019/01/01',
        events: {
          'key_e1': true,
        }
      }
    },
    events: {
      'key_e1': {
        name: 'ccc',
        description: 'ddd',
        createAt: '2019/01/01',
        members: {
          'key_m1': { join: true, pay: true, value: 10, joinedOn: '2019/01/02' },
          'key_m2': { join: true, pay: false, value: 0, joinedOn: '2019/01/04' }
        }
      },
      'key_e2': {
        name: 'ddd',
        description: 'ddd',
        createAt: '2019/01/01',
        members: {
          'key_m1': { join: true, pay: true, value: 5 }
        }
      }
    }
  }
};


function addStorage() {
  /*
  try {
    var data = { events: store.state.events, members: store.state.members }
    window.localStorage.setItem('data', JSON.stringify(data))
  } catch (err) {
    util.error(err)
  }
  */
}


function getStorage() {
  /*
  try {
    if (window.localStorage.hasOwnProperty('data')) {
      var data = JSON.parse(window.localStorage.data);
      if (!data) return;

      store.state.events = Object.assign({}, data.events);
      store.state.members = Object.assign({}, data.members);
      util.log('data loaded')
    }
  } catch (err) {
    util.error(err)
  }
  */
}


var util = {
  guid() {
    //util.log('util.guid')
    return '_' + Math.random().toString(36).substr(2, 9);
  },
  log(...args) {
    console.log(...args);
  },
  error(...args) {
    console.error(...args);
  },
  isNull(obj) {
    //util.log('util.isNull', obj)
    return obj === null || obj === undefined ? true : false;
  },
  isEmpty(obj) {
    //util.log('util.isEmpty', obj)
    return util.isNull(obj) || obj.trim().length === 0 ? true : false;
  },
  isLessLength(obj, value) {
    //util.log('util.isLessLength', obj, value)
    return util.isEmpty(obj) || obj.trim().length < value ? true : false;
  }
};


var store = {
  debug: true,
  state: {
    isProcessing: false,
    isLogged: false,
    eventKey: null,
    selectedEvent: null,
    googleData: {},
    events: {},
    members: {},
  },


  setProcessing(value) {
    util.log('store.setProcessing', value);
    store.state.isProcessing = value;
  },

  event: {

    add(event) {
      util.log('store.event.add', event);
      
      store.setProcessing(true);

      return new Promise((resolve, reject) => {

        if (util.isNull(event) || util.isEmpty(event.name)) {

          store.setProcessing(false);
          reject('Event name is necessary');
        }
        if (util.isLessLength(event.name, 3)) {

          store.setProcessing(false);
          reject('Event name needs have a minimum 3 characters.');

        } else {

          event.createAt = new Date().toJSON();
          google.addData('events', event).then((e) => {

            store.setProcessing(false);
            store.state.events = store.state.events || {};
            store.state.events[e] = event;
            resolve('this events has been added.');
          }).catch((e) => {

            store.setProcessing(false);
            util.log('error on google.addData', e);
            reject(e);
          });
        }
      });
    },

    update(event) {
      util.log('store.event.update', event);

      store.setProcessing(true);

      return new Promise((resolve, reject) => {

        if (util.isNull(event)) {

          store.setProcessing(false);
          reject('event not found');

        } else if (util.isEmpty(event.name)) {

          store.setProcessing(false);
          reject('blank name is not valid.');

        } else {

          var key = store.state.eventKey;

          event.updateAt = new Date().toJSON();

          google.updateData('events', key, event)
            .then(() => {
              Vue.set(store.state.events, key, event);
              store.setProcessing(false);
              resolve('this event has been updated.');
            })
            .catch((e) => {
              util.log('error on google.updateData', e);
              store.setProcessing(false);
              reject(e);
            });
        }
      });
    },

    load() {
      util.log('store.event.load');

      if (window.localStorage.hasOwnProperty('events')) {
        store.state.events = Object.assign({}, JSON.parse(window.localStorage.events));
      }
    },

    select(eventKey) {
      util.log('store.event.select', eventKey);

      var event = store.state.events[eventKey];
      store.state.eventKey = eventKey;
      store.state.selectedEvent = event;
    },
  },

  member: {

    changeData(memberKey, data) {
      util.log('store.member.changeData', memberKey, data);

      store.setProcessing(true);

      if (store.state.eventKey) {

        var eventKey = store.state.eventKey;
        var event = store.state.selectedEvent;
        var members = event.members || {};

        Vue.set(members, memberKey, data);

        util.log(2, JSON.stringify({ e: event/*, u: data, us: members, s: store.state.events */ }));
        // update object event[members] = membersconst
        Vue.set(event, 'members', members);
        util.log(3, JSON.stringify({ e: event/*, u: data, us: members, s: store.state.events */ }));

        const qty = Object.keys(members).length;
        let price = 0;


        if (event.payment == 'divided') {
          price = event.price / qty;
          event.pricePerUser = price;

        }

        // google firebase mode
        google.updateEventUserData(eventKey, memberKey, data)

          .then(() => {
            // update object    

            // var member = store.state.members[memberKey];
            // var events = member.events || {};
            // events[eventKey] = true;
            // // update member events
            // Vue.set(member, 'events', events);

            if (price > 0) {
              // update event price
              Vue.set(store.state.events, eventKey, event);
              google.updateData('events', eventKey, event);
            }

            // google.updateData('members', memberKey, { events: events });

            store.setProcessing(false);
            return 'this member has been updated.';
          })
          .catch((e) => {
            console.log('not ok');
            util.log('error on google.updateData', e);

            store.setProcessing(false);
            return e;
          });
      }
    },


    add(member) {
      util.log('store.member.add', member);

      store.setProcessing(true);

      return new Promise((resolve, reject) => {
        if (
          member.name === undefined ||
          member.name.toString().trim().length === 0) {
          
          store.setProcessing(false);
          reject('blank name is not valid.');

        } else {

          member.createAt = new Date().toJSON();
          // google firebase mode
          google.addData('members', member).then((e) => {
            store.state.members = store.state.members || {};
            store.state.members[e] = member;
            store.setProcessing(false);
            resolve('this member has been added.');
          }).catch((e) => {
            store.setProcessing(false);
            util.log('error on google.addData', e);
            reject(e);
          });
        }

      });
    },

    update(memberKey, member) {
      util.log('store.member.update', memberKey, member);

      store.setProcessing(true);

      var hasKey = store.state.members.hasOwnProperty(memberKey);

      return new Promise((resolve, reject) => {

        if (!hasKey) {

          store.setProcessing(false);
          reject('member not found');

        } else if (member.name === undefined ||
          member.name.toString().trim().length === 0) {

          store.setProcessing(false);
          reject('blank name is not valid.');

        } else {

          member.updateAt = new Date().toJSON();

          // google firebase mode
          google.updateData('members', memberKey, member)
            .then(() => {
              Vue.set(store.state.members, memberKey, member);
              store.setProcessing(false);
              resolve('this member has been updated.');
            })
            .catch((e) => {
              util.log('error on google.updateData', e);
              store.setProcessing(false);
              reject(e);
            });
        }

      });

    }
  },

  login: {

    create(login) {
      util.log('store.login.create', login);
      return google.create(login);
    },

    connect(login) {
      util.log('store.login.connect', login);
      if (this.debug) util.log('call login.connect');

      return google.login(login);
    }

  }
};


var google = {

  isLogged() {
    util.log('google.isLogged');

    return localStorage.logged == 'true' ? true : false;
    return firebase.auth().currentUser ? true : false;
  },

  uid() {
    util.log('google.uid');

    return firebase.auth().currentUser.uid;
  },

  create(account) {
    util.log('google.create', account);

    return new Promise((resolve, reject) => {

      firebase.auth().createUserWithEmailAndPassword(account.email, account.password)
        .then((e) => {
          resolve(e);
        })
        .catch((error) => {
          console.log('eee', error);
          // Handle Errors here.
          var errorCode = error.code;
          var errorMessage = error.message;

          if (errorCode == 'auth/weak-password') {
            reject('A senha é muito fraca.');
          } else {
            reject(errorMessage);
          }
        });
    });
  },

  login(account) {
    util.log('google.login', account);

    store.setProcessing(true);

    return new Promise((resolve, reject) => {

      firebase.auth().signInWithEmailAndPassword(account.email, account.password)
        .then((e) => {
          console.log(e);
          localStorage.logged = 'true';
          store.setProcessing(false);
          resolve(e);
        })
        .catch((error) => {
          console.log(error);
          store.setProcessing(false);
          // Handle Errors here.
          var errorCode = error.code;
          var errorMessage = error.message;

          if (errorCode === 'auth/wrong-password') {
            reject('Usuário ou senha errados.');
          } else {
            reject(errorMessage);
          }

          // ...
        });

    });
  },

  logoff() {
    util.log('google.logoff');

    localStorage.logged = null;
    firebase.auth().signOut();
  },

  loadDB() {
    util.log('google.loadDB');

    store.setProcessing(true);

    firebase.database().ref('/').once('value')
      .then(function (snap) {

        store.setProcessing(false);
        console.log(snap.val());

        var data = snap.val();
        store.state.googleData = data;
        store.state.members = data.members || {};
        store.state.events = data.events || {};

      })
      .catch(()=> {
        store.setProcessing(false);
      });
  },

  addData(local, data) {
    util.log('google.addData', local, data);

    // get google key
    var key = firebase.database().ref().child(local).push().key;

    // update google data
    return firebase.database()
      .ref(`${local}/${key}`).update(data)
      .then(() => {
        return key;
      })
      .catch((e) => {
        return e;
      });
  },

  updateData(local, key, data) {
    util.log('google.updateData', local, key, data);

    // update google data
    return firebase.database()
      .ref(`${local}/${key}`)
      .update(data);
  },

  updateEventUserData(eventKey, memberKey, data) {
    util.log('google.updateEventUserData', eventKey, memberKey, data);

    // update google data
    var uid = firebase.auth().currentUser.uid;
    return firebase.database()
      .ref(`events/${eventKey}/members/${memberKey}`)
      .update(data);
  }

};


Vue.component('my-event-data', {

  data() {
    util.log('my-event-data data');

    return {
      snackbar: false,
      event: {},
      mode: '',
      editData: false,
      errorMsg: '',
      sharedEvents: store.state,
      showConfirm: false,
      msgConfirm: '',
      items: [
        {text: LANG.EVENT_FIXED, value: 'fixed'},
        {text: LANG.EVENT_VARIED, value: 'varied'},
        {text: LANG.EVENT_DIVIDED, value: 'divided'}
      ],
      LANG,
    };
  },

  created() {
    util.log('my-event-data created');

    EventBus.$on('showEventEdit', () => {
      this.event = Object.assign({}, this.sharedEvents.selectedEvent);
      this.event.payment = this.event.payment ? this.event.payment : '0';
      this.mode = 'Edit';
      this.errorMsg = '';
      this.showConfirm = false;
      this.editData = true;
    });

    EventBus.$on('showEventNew', () => {
      this.event = {
        name: '',
        description: '',
        payment: '0',
        price: null,
      };
      this.mode = 'New';
      this.errorMsg = '';
      this.showConfirm = false;
      this.editData = true;
    });

    EventBus.$on('hideEventData', () => {
      this.editData = false;
    });

  },

  computed: {

    title() {
      util.log('my-event-data computed.title');

      return this.mode == 'Edit' ? this.LANG.EVENT_EDIT : this.LANG.EVENT_NEW;
    },

    needsPayment() {
      util.log('my-event-data computed.needsPayment');

      return this.event.payment === 'fixed' || this.event.payment === 'divided';
    },

    paymentDescription() {
      util.log('my-event-data computed.paymentDescription');

      switch (this.event.payment) {
          case 'fixed': {}
            return this.LANG.EVENT_INFORM_PRICE_FIXED;
      
          case 'divided':
            return this.LANG.EVENT_INFORM_PRICE_TOTAL;

          default:
            return '';
      }
    },

    isProcessing() {
      util.log('my-event-data computed.isProcessing');

      return this.sharedEvents.isProcessing;
    },

  },

  methods: {

    confirmClick(e) {
      util.log('my-event-data methods.confirmClick', e);

      if (e == true) {

        var data = new Promise((req, res)=>{});
        
        switch (this.mode) {
            case 'Edit':
              data = store.event.update(this.event);
              break;
            default:
              data = store.event.add(this.event);
              break;
        }

        data
          .then((e) => {
            this.showConfirm = false;
            this.gotoEventList();
          })
          .catch((e) => {
            this.showConfirm = false;
            this.snackbar = true;
            this.errorMsg = e;
          });

      } else {
        this.showConfirm = false;
      }

    },

    addEvent() {
      util.log('my-event-data methods.addEvent');

      const name = this.event.name || '';
      const msg = this.mode == 'Edit' ? this.LANG.EVENT_CONFIRM_EDIT : this.LANG.EVENT_CONFIRM_NEW;
      
      this.msgConfirm = `${msg} "${name}"?`;
      this.errorMsg = '';
      this.snackbar = false;
      this.showConfirm = true;
    },

    cancelEvent() {
      util.log('my-event-data methods.cancelEvent');

      EventBus.$emit('showEventList');
      this.editData = false;
    },
    
    clean() {
      util.log('my-event-data methods.clean');

      this.event = {};
      this.errorMsg = '';
    },

    gotoEventList() {
      util.log('my-event-data methods.gotoEventList');

      this.clean();
      EventBus.$emit('showEventList');
    },

  },

  template: `
    <v-form v-if="editData">
      <my-confirm v-if="showConfirm" :msg="msgConfirm" @click="confirmClick"></my-confirm>
      <v-text-field 
        @keyup.enter="addEvent" v-model="event.name" :label="LANG.EVENT_NAME"
        color="teal" outline type="text" />
      <v-textarea 
        @keyup.enter="addEvent" v-model="event.description" :label="LANG.EVENT_DESCRIPTION"
        color="teal" outline type="text" />
      <v-select 
        v-model="event.payment" :label="LANG.EVENT_PAYMENT_MODE" 
        :items="items" outline item-text="text" item-value="value"
        color="teal" />
      <template v-if="needsPayment">
        <v-text-field
        @keyup.enter="addEvent" v-model="event.price" :label="paymentDescription" 
        color="teal" outline type="text" />
      </template>
        
      <v-btn depressed color="success" @click.prevent="addEvent">{{LANG.SAVE}}</v-btn>
      <v-btn depressed color="error" @click.prevent="cancelEvent">{{LANG.CANCEL}}</v-btn>

      <v-snackbar v-model="snackbar" color="red" timeout="6000"vertical="true">
      {{ errorMsg }}
      <v-btn dark flat @click="snackbar = false">{{LANG.CLOSE}}</v-btn>
    </v-snackbar>
    </v-form>
  `

});


Vue.component('my-event-list', {

  data() {
    util.log('my-event-list data');

    return {
      sharedEvents: store.state,
      LANG,
      query: '',
    };
  },

  created() {
    EventBus.$on('changeText', (text) => {
      this.query = text;
    });
  },

  computed: {

    events() {
      util.log('my-event-list computed.events');

      var events = this.sharedEvents.events; 

      if (this.query.length >= 3) {
        let list = {};
        for ( event in events) { 
          if ( events[event].name.toLowerCase().indexOf(this.query.toLowerCase()) >= 0 ) {
            list[event] = events[event];
          }
        }
        return list;
      }
      return this.sharedEvents.events;
    }
  },

  methods: {

    selectEvent(eventKey) {
      util.log('my-event-list methods.selectEvent', eventKey);

      store.event.select(eventKey);
      EventBus.$emit('showEventUsers');
    },

    editEvent(eventKey) {
      util.log('my-event-list methods.editEvent', eventKey);

      store.event.select(eventKey);
      EventBus.$emit('showEventEdit');
    },

    isActive(eventKey) {
      util.log('my-event-list methods.isActive', eventKey);

      return this.sharedEvents.eventKey == eventKey ? true : false;
    },

  },

  template: `
    <v-card>
      <v-list two-line subheader>
        <v-subheader>
          {{LANG.EVENT_LIST.toUpperCase()}}
        </v-subheader>
        <v-divider></v-divider>

        <template v-for="(event, key, idx) in events">

          <!--<v-divider inset v-if="idx > 0"></v-divider>-->
          <v-divider v-if="idx > 0"></v-divider>
          
          <v-list-tile @click=""
             :class="{'teal lighten-5': isActive(key) }" >
            <!--<v-list-tile-action></v-list-tile-action>-->
            <v-list-tile-content @click.prevent="selectEvent(key)">
              <v-list-tile-title>{{ event.name }}</v-list-tile-title>
              <v-list-tile-sub-title>{{ event.description }}</v-list-tile-sub-title> 
            </v-list-tile-content>
              
            <v-list-tile-action @click.prevent="editEvent(key)">
              <v-tooltip left>  
                <v-btn icon slot="activator">
                  <v-icon color="teal">edit</v-icon>
                  </v-btn>
                <span>{{ LANG.EDIT }}</span>
              </v-tooltip>  
            </v-list-tile-action>  
          </v-list-tile>
        </template>

      </v-list>
    </v-card>
  `
});


Vue.component('my-event-selected', {

  data() {
    util.log('my-event-selected data');

    return {
      sharedEvents: store.state,
      price: null,
      LANG,
      query: '',
    };
  },

  created() {

  },

  computed: {

    members() {
      util.log('my-event-selected computed.members');

      return this.sharedEvents.members;
    },

    event() {
      util.log('my-event-selected computed.event');

      let event = this.sharedEvents.selectedEvent;

      switch (event.payment) {

          case 'fixed':
            this.price = event.price;
            break;

          case 'divided':
            let members = event.members || [];
            members = Object.keys(members);
            this.price = event.price / (members.length + 1);
            break;

          default:
            break;
      }

      return event;
    },

    hasPrice() {
      util.log('my-event-selected computed.hasPrice');

      return this.event.price ? true : false;
    },

    priceDescription() {
      util.log('my-event-selected computed.priceDescription');

      var value = 0;
      if (this.hasPrice) {
        if (this.event.payment === 'divided') {
          var members = this.event.members || [];
          members = Object.keys(members);
          value = this.event.price / (members.length);

          value = isFinite(value) ? value : this.event.price;

        } else if (this.event.payment === 'fixed') {

          value = this.event.price;
        }

        ;
        this.price = value;

        return `${value} ${this.LANG.PER_USER}`;
      }
      return '';
    },

  },

  template: `
    <v-layout justify-center v-if="event">
      <v-container fluid grid-list-xl >
      <v-layout row wrap>

      <v-flex xs12>
      <v-card >
        <v-layout row justify-center>
        <v-flex xs11> 
        <h2>{{event.name}}</h2>
        <p>{{LANG.EVENT_DESCRIPTION}}: {{event.description}}</p>
        <p v-if="hasPrice">{{priceDescription}}</p>
        </v-flex>
        </v-layout>
        <v-spacer></v-spacer>
      </v-card >
      </v-flex>

        
      <my-event-member v-for="(member,key) in members" 
          :data="{name:member.name, key:key}" ></my-event-member>
          
        </v-layout>
      </v-container>
    </v-layout>
  `
});


Vue.component('my-event-member', {

  data() {
    util.log('my-event-member data');

    return {
      sharedEvents: store.state,
      member: {},
      confirmValue: false,
      showConfirm: false,
      msgConfirm: '',
      mode: '',
      
      LANG,
    };
  },

  props: {
    data: {
      type: Object,
      required: true
    }
  },

  created() {
    util.log('my-event-member created');

    this.member = {
      join: (this.getMember.join || false),
      pay: (this.getMember.pay || false),
      value: (this.getMember.value || 0)
    };

  },

  computed: {

    event() {
      util.log('my-event-member computed.event');

      return this.sharedEvents.selectedEvent;
    },

    getMember() {
      util.log('my-event-member computed.getMember');

      return (this.event.members && this.event.members[this.data.key]) || {};
    }

  },

  methods: {

    callConfirm(mode) {
      util.log('my-event-member methods.callConfirm', mode);

      this.mode = mode;

      const msg = mode == 'pay' ? this.LANG.EVENT_CONFIRM_USER_PAY : this.LANG.EVENT_CONFIRM_USER_JOIN;

      this.msgConfirm = msg
        .replace('_NAME_', this.data.name)
        .replace('_VALUE_', this.member.value);
      this.showConfirm = true;
    },

    confirmClick(e) {
      util.log('my-event-member methods.confirmClick', e);

      this.showConfirm = false;


      if (e == true) {
        switch (this.mode) {

            case 'pay':
              this.member.join = true;
              this.member.pay = !this.member.pay;
              break;

            case 'join':
              this.member.join = true;
              break;

            default:
              break;
        }

        store.member.changeData(this.data.key, this.member);
      }
    },

  },

  template: `
    <v-flex x12>
      <my-confirm v-if="showConfirm" :msg="msgConfirm" @click="confirmClick"></my-confirm>
      <v-card>
        <v-layout row justify-center>
          <v-flex xs6 md7 text-xs-center> 
            <span class="headline">{{data.name}}</span>
            <v-form>
              <v-text-field 
                v-model="member.value" :label="LANG.EVENT_INFORM_PAYMENT_AMOUNT"
                small  color="teal" type="text" />
            </v-form>
          </v-flex>

          <v-flex  xs3 md2>
            <div><v-btn v-if="!member.join" @click.prevent="callConfirm('join')" 
              depressed block color="primary">{{LANG.JOIN}}</v-btn></div>
            <div><v-btn @click.prevent="callConfirm('pay')"
              depressed block color="primary">{{LANG.PAY}}</v-btn></div>
          </v-flex>
        </v-layout>
    
        <v-spacer></v-spacer>
      </v-card>
    </v-flex>
    
  `
  
});


Vue.component('my-confirm', {

  data() {
    util.log('my-confirm data');

    return {
      LANG
    };
  },

  props: {
    msg: {
      type: String,
      required: true
    }
  },

  methods: {

    click(value) {
      util.log('my-confirm methods.click', value);

      this.$emit('click', value);
    },

  },

  template: `
    <v-dialog persistent value="true">
      <v-card>
        <v-card-title class="headline">{{msg}}</v-card-title>
        <v-card-text></v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn value="false" color="green darken-1" flat @click="click(false)">{{LANG.CANCEL}}</v-btn>
          <v-btn value="true" color="green darken-1" flat @click="click(true)">{{LANG.CONFIRM}}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  `
});


Vue.component('my-member-list', {

  data() {
    util.log('my-member-list data');

    return {
      sharedEvents: store.state,
      LANG,
      query: '',
    };
  },

  computed: {

    members() {
      util.log('my-member-list computed.members');


      let members = this.sharedEvents.members; 

      if (this.query.length >= 3) {
        let list = {};
        for (let member in members) { 
          if ( members[member].name.toLowerCase().indexOf(this.query.toLowerCase()) >= 0 ) {
            list[member] = members[member];
          }
        }
        return list;
      }

      return members;
    }

  },

  created() {
    EventBus.$on('changeText', (text) => {
      this.query = text;
    });
  },

  methods: {

    edit(key, member) {
      util.log('my-member-list methods.edit', key, member);

      var memberEdit = {
        key: key,
        data: member
      };

      EventBus.$emit('showUserEdit', memberEdit);
    },

  },

  template: `
    <v-card>
      <v-list subheader>
        <v-subheader>
          {{LANG.USER_LIST.toUpperCase()}}
        </v-subheader>
        <v-divider></v-divider>

        <template v-for="(member, key, idx) in members">

          <!--<v-divider inset v-if="idx > 0"></v-divider>-->
          <v-divider v-if="idx > 0"></v-divider>
          
          <v-list-tile>
            <!--<v-list-tile-action></v-list-tile-action>-->
            <v-list-tile-content>
              <v-list-tile-title>{{ member.name }}</v-list-tile-title>
            </v-list-tile-content>
              
            <v-list-tile-action @click.prevent="edit(key, member)">
              <v-tooltip left>  
                <v-btn icon large slot="activator">
                  <v-icon large color="teal">edit</v-icon>
                  </v-btn>
                <span>{{ LANG.EDIT }}</span>
              </v-tooltip>  
            </v-list-tile-action>  
          </v-list-tile>
        </template>

      </v-list>
    </v-card>
  `
});


Vue.component('my-member-data', {

  data() {
    util.log('my-member-data data');

    return {
      member: {},
      snackbar: false,
      memberKey: '',
      mode: '',
      errorMsg: '',
      editData: false,
      showConfirm: false,
      msgConfirm: '',
      sharedEvents: store.state,
      LANG,
    };
  },

  mounted() {
    util.log('my-member-data mounted');

    EventBus.$on('hideUserData', () => {
      this.editData = false;
    });

    EventBus.$on('showUserEdit', member => {
      this.member = Object.assign({}, member.data);
      this.memberName = member.key;
      this.mode = 'Edit';
      this.errorMsg = '';
      this.editData = true;
    });

    EventBus.$on('showUserNew', (member) => {
      this.member = {
        name: '', email: ''
      };
      this.mode = 'New';
      this.errorMsg = '';
      this.editData = true;
    });

  },

  computed: {

    title() {
      util.log('my-member-data computed.title');

      return this.mode == 'Edit' ? LANG.USER_EDIT : LANG.USER_NEW;
    },


    isProcessing() {
      util.log('my-member-data computed.isProcessing');

      return this.sharedEvents.isProcessing;
    },


  },

  methods: {

    confirmClick(e) {
      util.log('my-member-data methods.confirmClick', e);

      if (e == true) {
        var data = new Promise((res, rej)=>{});

        if (this.mode === 'Edit') {
          data = store.member.update(this.memberName, this.member);
          
        } else {
          data = store.member.add(this.member);
        }

        data.then((e) => {
          this.showConfirm = false;
          this.goToUserList();
        });
        data.catch((e) => {
          this.errorMsg = e;
          this.snackbar = true;
        });

      } else {

        this.showConfirm = false;

      }

    },

    save() {
      util.log('my-member-data methods.save');

      const msg = this.mode == 'Edit' ? this.LANG.USER_CONFIRM_EDIT : this.LANG.USER_CONFIRM_NEW;

      this.msgConfirm = msg.replace('_NAME_', this.member.name || '');
      this.showConfirm = true;

    },

    cancel() {
      util.log('my-member-data methods.cancel');

      this.goToUserList();
    },

    goToUserList() {
      util.log('my-member-data methods.goToUserList');

      this.editData = false;
      EventBus.$emit('showUserList');
    },

  },

  template: `
    <v-form v-if="editData">
      <my-confirm v-if="showConfirm" :msg="msgConfirm" @click="confirmClick"></my-confirm>
        
      <v-text-field 
        @keyup.enter="save" v-model="member.name" :label="LANG.USER_NAME"
        color="teal" outline type="text" />
      <v-text-field 
        @keyup.enter="save" v-model="member.email" :label="LANG.USER_EMAIL"
        color="teal" outline type="email" />
    
        <v-btn depressed color="success" @click.prevent="save">{{LANG.SAVE}}</v-btn>
        <v-btn depressed color="error" @click.prevent="cancel">{{LANG.CANCEL}}</v-btn>

      <v-snackbar v-model="snackbar" color="red" timeout="6000"vertical="true">
      {{ errorMsg }}
      <v-btn dark flat @click="snackbar = false">{{LANG.CLOSE}}</v-btn>
    </v-form>
  `
});


Vue.component('my-login', {

  data() {
    util.log('my-login data');

    return {
      login: {},
      msg: '',
      LANG,
    };
  },

  methods: {

    create() {
      util.log('my-login methods.create');

      store.login.create(this.login)
        .then((e) => {
          this.msg = e;
        })
        .catch((e) => {
          this.msg = e;
        });

    },

    connect() {
      util.log('my-login methods.connect');

      store.login.connect(this.login)
        .then((e) => {
          this.msg = e;
          EventBus.$emit('login');
        })
        .catch((e) => {
          this.msg = e;
        });
    },

  },

  template: `
    <v-flex xs12 sm8 md8>
      <v-card class="elevation-12">
        <v-toolbar dark color="primary">
          <v-toolbar-title>Login form</v-toolbar-title>
        </v-toolbar>
        <v-card-text>
          <v-form>
            <v-text-field 
              @keyup.enter="connect" :label="LANG.EMAIL" v-model="login.email"
              prepend-icon="mail" name="login" type="email" />
            <v-text-field 
              @keyup.enter="connect" :label="LANG.PASSWORD" v-model="login.password"
              prepend-icon="lock" name="password" type="password"></v-text-field>
          </v-form>
          <p>{{msg}}</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click.prevent="connect" color="primary">{{LANG.LOGIN}}</v-btn>
          <v-btn @click.prevent="create" color="warning">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-flex>
  `
});


Vue.component('my-event', {

  data() {
    util.log('my-event data');

    return {
      showNav: null,
      connected: false,
      sharedEvents: store.state,
      showQuery: false,
      showList: false,
      queryText: '',

      showEventList: false,
      showEventData: false,
      showEventUsers: false,

      showUserList: false,
      showUserData: false,

      title: LANG.EVENT_LIST,
      LANG,
    };
  },

  mounted() {
    util.log('my-event mounted');

    this.selectEventList();
  },

  created() {
    util.log('my-event created');

    getStorage();

    EventBus.$on('login', () => {
      console.log('logou');
      this.connected = true;
    });

    EventBus.$on('showEventList', this.selectEventList);

    EventBus.$on('showEventUsers', this.selectEventUsers);

    EventBus.$on('showUserList', this.selectUserList);

    EventBus.$on('showEventEdit', () => { 
      this.title = this.LANG.EVENT_EDIT;
      this.hideComponents(); 
    });

    EventBus.$on('showUserEdit', () => { 
      this.title = this.LANG.USER_EDIT;
      this.hideComponents(); 
    });

    setTimeout(this.checkLogin(), 1000);

    google.loadDB();

    

  },

  computed: {

    isload() {
      util.log('my-event computed.load');

      return this.sharedEvents.isProcessing;
    },

  },

  methods: {

    loadData() {

      google.loadDB();
    },
    checkLogin() {
      util.log('my-event methods.checkLogin');

      this.connected = google.isLogged();

      if (this.connected == false) {
        setTimeout(this.checkLogin, 1000);
      }
    },

    logoff() {
      util.log('my-event methods.logoff');

      this.connected = false;
      google.logoff();
    },

    doQuery(text) {
      util.log('my-event methods.doQuery', text);

      EventBus.$emit('changeText', text);
    },

    selectEventUsers() {
      util.log('my-event methods.selectEventUsers');

      this.hideComponents();
      this.title = this.LANG.EVENT;
      this.showEventUsers = true;
    },

    selectEventNew() {
      util.log('my-event methods.selectEventNew');

      this.hideComponents();
      this.title = this.LANG.EVENT_NEW;
      EventBus.$emit('showEventNew');
    },

    selectEventList() {
      util.log('my-event methods.selectEventList');

      this.hideComponents();
      this.title = this.LANG.EVENT_LIST;
      this.showEventList = true;
      this.showList = true;
    },

    selectUserList() {
      util.log('my-event methods.selectUserList');

      this.hideComponents();
      this.title = this.LANG.USER_LIST;
      this.showUserList = true;
      this.showList = true;
    },

    selectUserNew() {
      util.log('my-event methods.selectUserNew');

      this.hideComponents();
      this.title = this.LANG.USER_NEW;
      EventBus.$emit('showUserNew');
    },

    hideComponents() {
      util.log('my-event methods.hideComponents');

      this.showNav = null;
      this.showQuery = false;
      this.showList = false;
      this.queryText = '';

      this.showEventList = false;
      //this.showEventNew = false;
      this.showUserList = false;
      this.showEventUsers = false;
      EventBus.$emit('hideUserData');
      EventBus.$emit('hideEventData');
    }

  },

  template: `
    <v-app>

      <v-dialog
        v-model="isload"
        persistent
        width="300"
        >
        <v-card color="primary" dark>
          <v-card-text>Carregando
            <v-progress-linear indeterminate color="white" class="mb-0"></v-progress-linear>
          </v-card-text>
        </v-card>
      </v-dialog>

      <v-navigation-drawer app fixed value="true" v-model="showNav" v-if="connected">

        <v-toolbar flat>
          <v-list>
            <v-list-tile>
              <v-list-tile-title class="title">Meus Eventos</v-list-tile-title>
            </v-list-tile>
          </v-list>


        </v-toolbar>

        <v-divider></v-divider>

        <v-list>

          <v-list-tile>
            <v-list-tile-content>
              <v-list-tile-title>MENU</v-list-tile-title>
            </v-list-tile-content>
          </v-list-tile>

          
          <v-divider></v-divider>

          <v-list-tile class="blue-grey lighten-5">
            <v-list-tile-action><v-icon>book</v-icon></v-list-tile-action>
            <v-list-tile-content>
              <v-list-tile-title>{{LANG.EVENT}}</v-list-tile-title>
            </v-list-tile-content>
          </v-list-tile>
          
          <v-list-tile @click.prevent="selectEventList">
          <v-list-tile-action></v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title>{{LANG.EVENT_LIST}}</v-list-tile-title>
          </v-list-tile-content>
          <v-list-tile-action><v-icon>list</v-icon></v-list-tile-action>
          </v-list-tile>

          <v-list-tile @click.prevent="selectEventNew">
          <v-list-tile-action></v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title>{{LANG.EVENT_NEW}}</v-list-tile-title>
          </v-list-tile-content>
          <v-list-tile-action><v-icon>add</v-icon></v-list-tile-action>
          </v-list-tile>

          <v-divider></v-divider>

          <v-list-tile class="blue-grey lighten-5">
          <v-list-tile-action><v-icon>person</v-icon></v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title>{{LANG.USER}}</v-list-tile-title>
          </v-list-tile-content>
          </v-list-tile>

          <v-list-tile  @click.prevent="selectUserList">
          <v-list-tile-action></v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title>{{LANG.USER_LIST}}</v-list-tile-title>
          </v-list-tile-content>
          <v-list-tile-action><v-icon>list</v-icon></v-list-tile-action>
          </v-list-tile>

          <v-list-tile @click.prevent="selectUserNew">
          <v-list-tile-action></v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title >{{LANG.USER_NEW}}</v-list-tile-title>
          </v-list-tile-content>
          <v-list-tile-action><v-icon>add</v-icon></v-list-tile-action>
          </v-list-tile>

          <v-divider></v-divider>

          <v-list-tile @click.prevent="logoff"  class="blue-grey lighten-5">
            <v-list-tile-action><v-icon>exit_to_app</v-icon></v-list-tile-action>
            <v-list-tile-content>
              <v-list-tile-title>{{LANG.LOGOUT}}</v-list-tile-title>
            </v-list-tile-content>
          </v-list-tile>

        </v-list>
      </v-navigation-drawer>

      <v-toolbar color="teal" dark fixed app v-if="connected">
        <v-toolbar-side-icon @click.stop="showNav = !showNav"></v-toolbar-side-icon>
        <v-toolbar-title v-if="!showQuery">{{title}}</v-toolbar-title>
        <v-spacer v-if="!showQuery"></v-spacer>
        <v-text-field v-if="showQuery" flat solo-inverted label="Search" v-model.lazy="queryText" @input="doQuery"></v-text-field>
  
        <v-btn v-if="showList" icon @click.prevent="showQuery = !showQuery">
          <v-icon>search</v-icon>
        </v-btn>

        <v-tooltip bottom>
          <v-btn @click.prevent="loadData" icon slot="activator" >
            <v-icon >replay</v-icon>
          </v-btn>
          <span>Atualizar</span>
        </v-tooltip>
      </v-toolbar>
        
      <v-content>
        <v-container fluid >

          <v-layout justify-center v-if="!connected">
            <my-login />
          </v-layout>

          <template v-else> 
           
          <v-layout justify-center align-center>
          <v-flex x12 sm10 md10 >
      <!--<my-confirm v-if="showConfirm" :msg="msgConfirm" @click="confirmClick"></my-confirm>-->
      
            <my-event-list v-if="showEventList" />
            
            <my-event-data />
            
            <my-event-selected v-if="showEventUsers"/>
            
            <my-member-list v-if=showUserList />
            
            <my-member-data />
            
            
            </v-flex>
            </v-layout>
            <!--
            <v-card>
            <div><h3>Code</h3>{{isload}}<pre>{{sharedEvents}}</pre></div>
            </v-card>-->

          </template>
          

        </v-container>
      </v-content>
    </v-app>
  `,
});


const EventBus = new Vue();

Vue.use(Vuetify);

new Vue({
  render: (h) => h('my-event')
}).$mount('#app');

