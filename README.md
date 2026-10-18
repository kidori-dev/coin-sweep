# coin-sweep

``
CREATE2 + Clones
``
## 셋업

```bash
npm install
cp .env.example .env   # ALCHEMY_URL, CHAIN_ID, ALCHEMY_API_KEY (, ALCHEMY_SUB_API_KEY), DB_* 채우기
npm run migration:run  # blocks 테이블 생성
```

## CLI

```bash
# blocks 테이블의 마지막 블록 다음부터(비어 있으면 지금 블록부터) 최신까지 따라가며 저장 (Ctrl+C 로 종료)
npm run cli -- polling-block

# 지정한 블록 높이 하나만 조회해서 저장
npm run cli -- target-block 12345678
```
