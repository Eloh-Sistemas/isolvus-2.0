import './Card.css';

function Card(props){


    function clickCard(){
        props.onclickCard();
    }

    return(
        <>
             <div onClick={() => clickCard()} className="card">
                <div className="card-body">
                    <div className="row">
                        <div className="col mt-0">
                            <h5 className="card-title">{props.titulo}</h5>
                        </div>

                        <div className="col-auto">
                            <div className="stat text-primary">
                                 <i className={props.iconebootstrap}></i>
                            </div>
                        </div>
                    </div>
                    <h1 className="mt-1 mb-3 h1">{props.valor}</h1>
                    <div className="mb-0">
                        <span className="text-danger"> <i className="mdi mdi-arrow-bottom-right"></i>{props.subValor}</span>
                        <span className="text-muted">{props.inf}</span>
                    </div>
                </div>
            </div> 
        </>
    );
}

export default Card;