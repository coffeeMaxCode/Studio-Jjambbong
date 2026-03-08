class Pool {
    /**
     * @param {Function} createFn - 객체의 새 인스턴스를 반환하는 함수입니다.
     * @param {number} initialSize - 초기에 생성할 객체의 수입니다.
     */
    constructor(createFn, initialSize = 100) {
        this.createFn = createFn;
        this.active = [];
        this.inactive = [];

        for (let i = 0; i < initialSize; i++) {
            this.inactive.push(this.createFn());
        }
    }

    /**
     * 풀에서 객체를 가져옵니다. 비활성 객체가 비어있으면 새로 생성합니다.
     */
    get() {
        let obj;
        if (this.inactive.length > 0) {
            obj = this.inactive.pop();
        } else {
            // 풀이 소진됨, 동적으로 늘림
            obj = this.createFn();
        }
        
        // 반환되는 객체는 필요에 따라 호출된 위치에서 상태를 초기화해야 합니다.
        this.active.push(obj);
        return obj;
    }

    /**
     * 재사용을 위해 객체를 풀로 반환합니다.
     * @param {Object} obj 
     */
    release(obj) {
        const index = this.active.indexOf(obj);
        if (index > -1) {
            // 활성화 배열에서 제거 (순서가 중요하지 않다면 전체 재배열(O(N) splice)을 피하기 위해
            // 마지막 요소와 맞바꾸는 방법을 쓸 수도 있지만, 병목이 발생하기 전까진 기본 splice를 사용합니다)
            this.active.splice(index, 1);
            this.inactive.push(obj);
        }
    }

    /**
     * 모든 활성화된 객체를 풀로 반환합니다.
     */
    releaseAll() {
        while (this.active.length > 0) {
            this.inactive.push(this.active.pop());
        }
    }
}
