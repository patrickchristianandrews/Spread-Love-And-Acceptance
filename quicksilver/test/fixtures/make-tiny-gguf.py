# Writes a tiny random-weight llama GGUF (with a ChatML template) to test the local engine end to end.
import numpy as np, gguf, sys
out = sys.argv[1]

def bytes_to_unicode():
    bs = list(range(ord("!"), ord("~") + 1)) + list(range(ord("¡"), ord("¬") + 1)) + list(range(ord("®"), ord("ÿ") + 1))
    cs = bs[:]
    n = 0
    for b in range(256):
        if b not in bs:
            bs.append(b); cs.append(256 + n); n += 1
    return [chr(c) for _, c in sorted(zip(bs, cs))]

toks = bytes_to_unicode(); types = [1] * 256
merges = ["Ġ t", "h e", "Ġ a", "i n"]
for m in merges:
    toks.append(m.replace(" ", "")); types.append(1)
for s in ["<|endoftext|>", "<|im_start|>", "<|im_end|>"]:
    toks.append(s); types.append(3)
V = len(toks); E = 64; L = 2; H = 4; F = 128
w = gguf.GGUFWriter(out, "llama")
w.add_name("Tiny Test Model"); w.add_context_length(4096); w.add_embedding_length(E); w.add_block_count(L)
w.add_feed_forward_length(F); w.add_head_count(H); w.add_head_count_kv(H); w.add_rope_dimension_count(E // H)
w.add_layer_norm_rms_eps(1e-5); w.add_file_type(0)
w.add_tokenizer_model("gpt2"); w.add_tokenizer_pre("default"); w.add_token_list(toks); w.add_token_types(types); w.add_token_merges(merges)
w.add_bos_token_id(V - 3); w.add_eos_token_id(V - 1)
w.add_chat_template("{% for message in messages %}{{'<|im_start|>' + message['role'] + '\n' + message['content'] + '<|im_end|>' + '\n'}}{% endfor %}{% if add_generation_prompt %}{{ '<|im_start|>assistant\n' }}{% endif %}")
r = np.random.default_rng(0)
f = lambda *s: (r.standard_normal(s) * 0.05).astype(np.float32)
w.add_tensor("token_embd.weight", f(V, E)); w.add_tensor("output_norm.weight", np.ones(E, np.float32)); w.add_tensor("output.weight", f(V, E))
for i in range(L):
    p = f"blk.{i}."
    w.add_tensor(p + "attn_norm.weight", np.ones(E, np.float32))
    for n in ["attn_q", "attn_k", "attn_v", "attn_output"]:
        w.add_tensor(p + n + ".weight", f(E, E))
    w.add_tensor(p + "ffn_norm.weight", np.ones(E, np.float32))
    w.add_tensor(p + "ffn_gate.weight", f(F, E)); w.add_tensor(p + "ffn_up.weight", f(F, E)); w.add_tensor(p + "ffn_down.weight", f(E, F))
w.write_header_to_file(); w.write_kv_data_to_file(); w.write_tensors_to_file(); w.close()
print("ok", V)
