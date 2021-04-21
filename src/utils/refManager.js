class RefManager {
  constructor() {
    this.refs = {};
  }

  add = (ref, name) => {
    if (!this.refs.hasOwnProperty(name)) {
      this.refs[name] = ref;
    } else if (!Array.isArray(this.refs[name])) {
      this.refs[name] = [this.refs[name], ref];
    } else {
      this.refs[name].push(ref);
    }
  };

  get = (name) => {
    return this.refs[name];
  };

  getIndex = (name, index) => {
    return this.refs[name]?.[index];
  };
}

const refManager = new RefManager();

export default refManager;
