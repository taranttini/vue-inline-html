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
      store.state.isProcessing = true;

      return new Promise((resolve, reject) => {

        if (util.isNull(event) || util.isEmpty(event.name)) {
          store.state.isProcessing = false;
          reject('Event name is necessary');
        }
        if (util.isLessLength(event.name, 3)) {
          store.state.isProcessing = false;
          reject('Event name needs have a minimum 3 characters.');

        } else {

          google.addData('events', event).then((e) => {

            store.state.isProcessing = false;
            store.state.events[e] = event;
            resolve('this events has been added.');
          }).catch((e) => {

            store.state.isProcessing = false;
            util.log('error on google.addData', e);
            reject(e);
          });
        }
      });
    },

    update(event) {
      util.log('store.event.update', event);

      return new Promise((resolve, reject) => {

        if (util.isNull(event)) {
          reject('event not found');
        } else if (util.isEmpty(event.name)) {
          reject('blank name is not valid.');
        } else {
          var key = store.state.eventKey;

          google.updateData('events', key, event)
            .then(() => {
              Vue.set(store.state.events, key, event);
              resolve('this event has been updated.');
            })
            .catch((e) => {
              util.log('error on google.updateData', e);
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

            var member = store.state.members[memberKey];
            var events = member.events || {};
            events[eventKey] = true;
            // update member events
            Vue.set(member, 'events', events);

            if (price > 0) {
              // update event price
              Vue.set(store.state.events, eventKey, event);
              google.updateData('events', eventKey, event);
            }

            google.updateData('members', memberKey, { events: events });

            return 'this member has been updated.';
          })
          .catch((e) => {
            console.log('not ok');
            util.log('error on google.updateData', e);
            return e;
          });
      }
    },


    add(member) {
      util.log('store.member.add', member);

      return new Promise((resolve, reject) => {
        if (
          member.name === undefined ||
          member.name.toString().trim().length === 0) {
          reject('blank name is not valid.');

        } else {

          // google firebase mode
          google.addData('members', member).then((e) => {
            store.state.members[e] = member;
            resolve('this member has been added.');
          }).catch((e) => {
            util.log('error on google.addData', e);
            reject(e);
          });
        }

      });
    },

    update(memberKey, member) {
      util.log('store.member.update', memberKey, member);

      var hasKey = store.state.members.hasOwnProperty(memberKey);

      return new Promise((resolve, reject) => {

        if (!hasKey) {

          reject('member not found');

        } else if (member.name === undefined ||
          member.name.toString().trim().length === 0) {

          reject('blank name is not valid.');

        } else {

          // google firebase mode
          google.updateData('members', memberKey, member)
            .then(() => {
              Vue.set(store.state.members, memberKey, member);
              resolve('this member has been updated.');
            })
            .catch((e) => {
              util.log('error on google.updateData', e);
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

    return new Promise((resolve, reject) => {

      firebase.auth().signInWithEmailAndPassword(account.email, account.password)
        .then((e) => {
          console.log(e);

          resolve(e);
        })
        .catch((error) => {
          console.log(error);
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

    firebase.auth().signOut();
  },

  loadDB() {
    util.log('google.loadDB');

    store.state.isProcessing = true;

    firebase.database().ref('/').once('value')
      .then(function (snap) {

        store.state.isProcessing = false;
        console.log(snap.val());

        var data = snap.val();
        store.state.googleData = data;
        store.state.members = data.members;
        store.state.events = data.events;

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
      event: {},
      mode: '',
      editData: false,
      errorMsg: '',
      sharedEvents: store.state,
      showConfirm: false,
      msgConfirm: '',
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

      if (e == 'true') {
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
    <div v-if="editData">
      <my-confirm v-if="showConfirm" :msg="msgConfirm" @click="confirmClick"></my-confirm>
      <div v-else>
        <div v-if="isProcessing">{{ LANG.PROCESSING }}</div>
        <div> 
            <div>
                <h2>{{ title }}</h2>
            </div>
            <div>
              <input type="text" v-model="event.name" :placeholder="LANG.EVENT_NAME" @keyup.enter="addEvent" />
            </div>
            <div>
                <textarea v-model="event.description" :placeholder="LANG.EVENT_DESCRIPTION" @keyup.enter="addEvent">
                </textarea>
            </div>
            <div>
              <select v-model="event.payment">
                <option disabled value="0">{{LANG.EVENT_PAYMENT_MODE}}</option>
                <option value='fixed'>{{LANG.EVENT_FIXED}}</option>
                <option value='varied'>{{LANG.EVENT_VARIED}}</option>
                <option value='divided'>{{LANG.EVENT_DIVIDED}}</option>
              </select>
            </div>
            <div v-if="needsPayment">
              <input v-model="event.price" :placeholder="paymentDescription" @keyup.enter="addEvent" />
            </div>
            <div>
              <button @click.prevent="addEvent">{{LANG.SAVE}}</button>
              <button @click.prevent="cancelEvent">{{LANG.CANCEL}}</button>
            </div>
        </div>
        <p>{{ errorMsg }}</p>
      </div>
    </div>
  `

});


Vue.component('my-event-list', {

  data() {
    util.log('my-event-list data');

    return {
      sharedEvents: store.state,
      LANG
    };
  },

  computed: {

    events() {
      util.log('my-event-list computed.events');

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

      return this.sharedEvents.eventKey == eventKey ? '> ' : '';
    },

  },

  template: `
    <div>
      <h2>{{LANG.EVENT_LIST}}</h2>
      <ul>
        <li v-for="(event, key) in events" :key="key">
          <a href="#" @click.prevent="selectEvent(key)">{{isActive(key)}}{{event.name}}</a>
          <button @click.prevent="editEvent(key)">{{LANG.EDIT}}</button>
        </li>
      </ul>
    </div>
  `
});


Vue.component('my-event-selected', {

  data() {
    util.log('my-event-selected data');

    return {
      sharedEvents: store.state,
      price: null,
      LANG,
    };
  },

  computed: {

    members() {
      util.log('my-event-selected computed.members');

      return this.sharedEvents.members;
    },

    event() {
      util.log('my-event-selected computed.event');

      var event = this.sharedEvents.selectedEvent;

      switch (event.payment) {

          case 'fixed':
            this.price = event.price;
            break;

          case 'divided':
            var members = event.members || [];
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
    <div>
      <div>
        <h2>{{LANG.EVENT_SELECTED}} "{{event.name}}"</h2>
        <p>{{LANG.EVENT_DESCRIPTION}}: {{event.description}}</p>
        <p v-if="hasPrice">{{priceDescription}}</p>
      </div>
      <div v-if="event">
          <my-event-member 
            v-for="(member,key) in members" 
            :data="{name:member.name, key:key}" 
            />
        </div>
      </div>
    </div>
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
      this.msgConfirm = msg
        .replace('_NAME_', this.data.name)
        .replace('_VALUE_', this.member.value);
      this.showConfirm = true;
    },

    confirmClick(e) {
      util.log('my-event-member methods.confirmClick', e);

      this.showConfirm = false;


      if (e == 'true') {
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
    <div>
      <my-confirm v-if="showConfirm" :msg="msgConfirm" @click="confirmClick"></my-confirm>
      <div v-else>
        <span>{{data.name}}</span>
        <button v-if="!member.join" @click.prevent="callConfirm('join')">{{LANG.JOIN}}</button>
        <button @click.prevent="callConfirm('pay')">{{LANG.PAY}}</button>
        <input v-model="member.value" :placeholder="LANG.EVENT_INFORM_PAYMENT_AMOUNT" />
      </div>
    </div>
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

    click(e) {
      util.log('my-confirm methods.click', e);

      this.$emit('click', e.target.value);
    },

  },

  template: `
    <div>
      <h2>{{msg}}</h2>
      <button value="true" @click.prevent="click">{{LANG.CONFIRM}}</button>
      <button value="false" @click.prevent="click">{{LANG.CANCEL}}</button>
    </div>
  `
});


Vue.component('my-member-list', {

  data() {
    util.log('my-member-list data');

    return {
      sharedEvents: store.state,
      LANG,
    };
  },

  computed: {

    members() {
      util.log('my-member-list computed.members');

      return this.sharedEvents.members;
    }

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
    <div>
      <h2>{{LANG.USER_LIST}}</h2>
      <ul>
        <li v-for="(member, key) in members">
          <span>{{ member.name }}</span><button @click.prevent="edit(key, member)">{{LANG.EDIT}}</button>
        </li>
      </ul>
    </div>
  `
});


Vue.component('my-member-data', {

  data() {
    util.log('my-member-data data');

    return {
      member: {},
      memberKey: '',
      mode: '',
      msg: '',
      editData: false,
      showConfirm: false,
      msgConfirm: '',
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
      this.msg = '';
      this.editData = true;
    });

    EventBus.$on('showUserNew', (member) => {
      this.member = {
        name: '', email: ''
      };
      this.mode = 'New';
      this.msg = '';
      this.editData = true;
    });

  },

  computed: {

    title() {
      util.log('my-member-data computed.title');

      return this.mode == 'Edit' ? LANG.USER_EDIT : LANG.USER_NEW;
    },

  },

  methods: {

    confirmClick(e) {
      util.log('my-member-data methods.confirmClick', e);

      if (e == 'true') {
        var data = new Promise((res, rej)=>{});

        if (this.mode === 'Edit') {
          data = 
          store.member.update(this.memberName, this.member);
          
        } else {
          data = store.member.add(this.member);
        }

        data.then((e) => {
          this.showConfirm = false;
          this.goToUserList();
        });
        data.catch((e) => {
          this.msg = e;
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
    <div v-if="editData">
      <my-confirm v-if="showConfirm" :msg="msgConfirm" @click="confirmClick"></my-confirm>
      <div v-else>
      <h2>{{title}}</h2>
      <div>
        <label>{{LANG.NAME}}</label>
        <input type="text" v-model="member.name"  @keyup.enter="save" :placeholder="LANG.USER_NAME" />
      </div>
      <div>
          <label>{{LANG.EMAIL}}</label>
          <input type="email" v-model="member.email" @keyup.enter="save" :placeholder="LANG.USER_EMAIL" />
      </div>
      <div>
        <button @click.prevent="save">{{LANG.SAVE}}</button>
        <button @click.prevent="cancel">{{LANG.CANCEL}}</button>
      </div>
      <p>{{msg}}</p>
      </div>
    </div>
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
    <div>
      <div>
        <div><input type="email" v-model="login.email" :placeholder="LANG.EMAIL" @keyup.enter="connect" /></div>
        <div><input type="password" v-model="login.password" :placeholder="LANG.PASSWORD" @keyup.enter="connect" /></div>
      </div>
      <div>
        <button @click.prevent="connect">{{LANG.LOGIN}}</button>
        <button @click.prevent="create">Create</button>
      </div>
      <p>{{msg}}</p>
    </div>
  `
});


Vue.component('my-event', {

  data() {
    util.log('my-event data');

    return {
      connected: false,
      sharedEvents: store.state,
      showEventList: true,
      showEventNew: false,
      showEventData: false,
      showEventUsers: false,

      showUserList: false,
      showUserData: false,
    };
  },

  created() {
    util.log('my-event created');

    getStorage();

    EventBus.$on('login', () => {
      console.log('logou');
      this.connected = true;
    });

    EventBus.$on('showEventList', this.selectEventList);

    EventBus.$on('showEventUsers', () => { 
      this.selectEventUsers(); 
    });

    EventBus.$on('showUserList', () => {
      this.selectUserList(); 
    });

    EventBus.$on('showEventEdit', () => { 
      this.hideComponents(); 
    });

    EventBus.$on('showUserEdit', () => { 
      this.hideComponents(); 
    });

    setTimeout(this.checkLogin(), 1000);

    google.loadDB();

  },

  computed: {

    load() {
      util.log('my-event computed.load');

      return this.sharedEvents.isProcessing;
    },

  },

  methods: {

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

    selectEventUsers() {
      util.log('my-event methods.selectEventUsers');

      this.hideComponents();
      this.showEventUsers = true;
    },

    selectEventNew() {
      util.log('my-event methods.selectEventNew');

      this.hideComponents();
      EventBus.$emit('showEventNew');
    },

    selectEventList() {
      util.log('my-event methods.selectEventList');

      this.hideComponents();
      this.showEventList = true;
    },

    selectUserList() {
      util.log('my-event methods.selectUserList');

      this.hideComponents();
      this.showUserList = true;
    },

    selectUserNew() {
      util.log('my-event methods.selectUserNew');

      this.hideComponents();
      EventBus.$emit('showUserNew');
    },

    hideComponents() {
      util.log('my-event methods.hideComponents');

      this.showEventList = false;
      this.showEventNew = false;
      this.showUserList = false;
      this.showEventUsers = false;
      EventBus.$emit('hideUserData');
      EventBus.$emit('hideEventData');
    }

  },

  template: `
    <div>
      <my-login v-if="!connected"></my-login>
      <div v-else>
        <button @click.prevent="logoff">{{LANG.LOGOUT}}</button>
        <h3>Menu</h3>
        <ul>
          <li>{{LANG.EVENT}}</li>
          <li><button @click.prevent="selectEventList">{{LANG.EVENT_LIST}}</button></li>
          <li><button @click.prevent="selectEventNew">{{LANG.EVENT_NEW}}</button></li>
          <li>{{LANG.USER}}</li>
          <li><button @click.prevent="selectUserList">{{LANG.USER_LIST}}</button></li>
          <li><button @click.prevent="selectUserNew">{{LANG.USER_NEW}}</button></li>
        </ul>
        <h3>Screen</h3>
        <div>
          <my-event-list v-if="showEventList" />
          <my-event-data />
          <my-event-selected v-if="showEventUsers"/>
          <my-member-list v-if=showUserList />
          <my-member-data />
        </div>

        <div>
          <h3>Code</h3>
          {{load}}
          <pre>{{sharedEvents}}</pre>
        </div>
      </div>
    </div>
  `,
});


var EventBus = new Vue();


new Vue({
  render: (h) => h('my-event')
}).$mount('#app');

